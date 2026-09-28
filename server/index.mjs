import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { env, pipeline } from '@huggingface/transformers';

const root = path.resolve(import.meta.dirname, '..');
env.cacheDir = process.env.MODEL_CACHE_DIR || path.join(root, 'model-cache');
const dataDir = path.join(root, 'public', 'data');
const chunks = JSON.parse(fs.readFileSync(path.join(dataDir, 'chunks.json')));
const items = JSON.parse(fs.readFileSync(path.join(dataDir, 'items.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json')));
const vectorsBuffer = fs.readFileSync(path.join(dataDir, 'passages.f32'));
const vectors = new Float32Array(vectorsBuffer.buffer.slice(vectorsBuffer.byteOffset, vectorsBuffer.byteOffset + vectorsBuffer.byteLength));
if (vectors.length !== chunks.length * manifest.dimensions) throw new Error('Embedding index does not match transcript chunks');
const itemById = new Map(items.map((item) => [item.id, item]));
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

const stopWords = new Set('a an and are as at be by can did do for from how in is it of on or the their this to was were what when where who why with about say said tdwg'.split(' '));
// Keys are matched against the raw query, so hyphenated keys work. The captions are
// American-spelled ASR, which writes DiSSCo as "disco".
const aliases = new Map([
  ['dwc', 'darwin core'], ['dwc-dp', 'darwin core data package'],
  ['dissco', 'distributed system of scientific collections disco'],
  ['mids', 'minimum information about a digital specimen'],
  ['ai', 'artificial intelligence'], ['llm', 'large language model'],
]);
const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
// Just enough stemming to bridge British spellings and plurals, applied to both sides.
function normalize(word) {
  return word.replace(/isation/, 'ization').replace(/ization$/, 'ize').replace(/([iy])s(e|ed|es|ing)$/, '$1z$2')
    .replace(/ies$/, 'y').replace(/([^s])s$/, (match, previous) => word.length > 3 ? previous : match);
}
function tokens(text) {
  return words(text).filter((word) => word.length > 1 && !stopWords.has(word)).map(normalize);
}
function matchedAliases(query) {
  const lower = query.toLowerCase();
  const found = [...aliases.keys()].filter((alias) => new RegExp(`(^|[^\\p{L}\\p{N}])${alias}($|[^\\p{L}\\p{N}])`, 'u').test(lower));
  return found.filter((alias) => !found.some((other) => other !== alias && other.includes(alias)));
}
function queryTerms(query) {
  const terms = tokens(query);
  for (const alias of matchedAliases(query)) terms.push(...tokens(aliases.get(alias)));
  return [...new Set(terms)];
}

const postings = new Map();
const lengths = [];
chunks.forEach((chunk, index) => {
  const terms = tokens(chunk.text);
  lengths.push(terms.length);
  const counts = new Map();
  for (const term of terms) counts.set(term, (counts.get(term) || 0) + 1);
  for (const [term, count] of counts) {
    if (!postings.has(term)) postings.set(term, []);
    postings.get(term).push([index, count]);
  }
});
const averageLength = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;

function lexicalRanking(terms) {
  const scores = new Float32Array(chunks.length);
  for (const term of terms) {
    const list = postings.get(term);
    if (!list) continue;
    const idf = Math.log(1 + (chunks.length - list.length + 0.5) / (list.length + 0.5));
    for (const [index, frequency] of list) {
      const denominator = frequency + 1.2 * (0.25 + 0.75 * lengths[index] / averageLength);
      scores[index] += idf * frequency * 2.2 / denominator;
    }
  }
  return Array.from(scores, (score, index) => ({ index, score })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 100);
}

// Calibrated by eye for bge-small with CLS pooling: on-topic queries score ~0.71-0.89, off-topic ones ≤0.66.
const weakMatchScore = 0.7;
let modelReady = false;
const modelPromise = pipeline('feature-extraction', manifest.model, { dtype: 'q8', revision: manifest.revision }).then((model) => { modelReady = true; return model; });
async function denseRanking(query) {
  const extractor = await modelPromise;
  const output = await extractor(`Represent this sentence for searching relevant passages: ${query}`, { pooling: manifest.pooling || 'mean', normalize: true });
  const queryVector = output.data;
  const scores = new Array(chunks.length);
  for (let index = 0; index < chunks.length; index++) {
    let score = 0;
    const offset = index * manifest.dimensions;
    for (let dimension = 0; dimension < manifest.dimensions; dimension++) score += vectors[offset + dimension] * queryVector[dimension];
    scores[index] = { index, score };
  }
  return scores.sort((a, b) => b.score - a.score).slice(0, 100);
}

async function search(query) {
  const lexical = lexicalRanking(queryTerms(query));
  const expansions = matchedAliases(query).map((alias) => aliases.get(alias));
  const dense = await denseRanking(expansions.length ? `${query} (${expansions.join('; ')})` : query);
  const aliasWords = new Set(matchedAliases(query).flatMap(words));
  const unmatchedTerms = words(query).filter((word) => word.length >= 4 && !stopWords.has(word) && !aliasWords.has(word) && !postings.has(normalize(word)));
  // A word nobody said plus a weak semantic match means the conference probably didn't cover it.
  const weak = unmatchedTerms.length > 0 && dense[0].score < weakMatchScore;
  const fused = new Map();
  for (const ranking of [lexical, dense]) ranking.forEach(({ index }, rank) => {
    fused.set(index, (fused.get(index) || 0) + 1 / (60 + rank + 1));
  });
  const byItem = new Map();
  const ranked = [...fused].map(([index, score]) => {
    const chunk = chunks[index], item = itemById.get(chunk.itemId);
    return [index, score * (chunk.start < item.start + 35 ? 0.85 : 1)];
  }).sort((a, b) => b[1] - a[1]);
  for (const [index, score] of ranked) {
    const chunk = chunks[index];
    if (!byItem.has(chunk.itemId)) byItem.set(chunk.itemId, { item: itemById.get(chunk.itemId), score, moments: [] });
    const group = byItem.get(chunk.itemId);
    if (group.moments.length >= 3 || group.moments.some((moment) => Math.abs(moment.start - chunk.start) < 45)) continue;
    group.moments.push({ start: chunk.start, end: chunk.end, text: chunk.text });
    group.score = Math.max(group.score, score);
  }
  return {
    unmatchedTerms,
    weak,
    results: [...byItem.values()].sort((a, b) => b.score - a.score).slice(0, weak ? 5 : 18)
      .map(({ item, moments }) => ({ id: item.id, title: item.title, speakers: item.speakers, session: item.session, room: item.room, date: item.date, videoUrl: item.videoUrl, moments })),
  };
}

// In the container the built site is served from here too, so pages and search share one origin.
const staticDir = path.resolve(process.env.STATIC_DIR || path.join(root, 'dist'));
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.f32': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};
function serveStatic(pathname, response) {
  let file;
  try { file = path.join(staticDir, decodeURIComponent(pathname)); } catch { return false; }
  if (!file.startsWith(staticDir + path.sep) && file !== staticDir) return false;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': pathname.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
  });
  fs.createReadStream(file).pipe(response);
  return true;
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/health') { sendJson(response, modelReady ? 200 : 503, { ok: modelReady, items: items.length, chunks: chunks.length }); return; }
  if (url.pathname === '/api/search') {
    const origin = request.headers.origin;
    if (allowedOrigin === '*' || origin === allowedOrigin) response.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : origin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    if (request.method !== 'GET') { sendJson(response, 405, { error: 'Method not allowed' }); return; }
    const query = (url.searchParams.get('q') || '').trim().slice(0, 240);
    if (query.length < 2) { sendJson(response, 400, { error: 'Enter at least two characters' }); return; }
    try { sendJson(response, 200, { query, ...await search(query) }); }
    catch (error) { console.error(error); sendJson(response, 500, { error: 'Search is temporarily unavailable' }); }
    return;
  }
  if ((request.method === 'GET' || request.method === 'HEAD') && serveStatic(url.pathname, response)) return;
  if (fs.existsSync(path.join(staticDir, '404.html'))) {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(staticDir, '404.html')).pipe(response);
    return;
  }
  sendJson(response, 404, { error: 'Not found' });
}).listen(port, '0.0.0.0', () => console.log(`TDWG explorer listening on ${port}`));
