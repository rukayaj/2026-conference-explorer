import {
  aliases,
  stopWords,
  words,
  normalize,
  matchedAliases,
  queryTerms,
  createLexicalIndex,
} from "../shared/search.mjs";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { env, pipeline } from "@huggingface/transformers";

const root = path.resolve(import.meta.dirname, "..");
env.cacheDir = process.env.MODEL_CACHE_DIR || path.join(root, "model-cache");
const dataDir = process.env.DATA_DIR || path.join(root, "public", "data");
const chunks = JSON.parse(fs.readFileSync(path.join(dataDir, "chunks.json")));
const items = JSON.parse(fs.readFileSync(path.join(dataDir, "items.json")));
const manifest = JSON.parse(
  fs.readFileSync(path.join(dataDir, "manifest.json")),
);
const vectorsBuffer = fs.readFileSync(path.join(dataDir, "passages.f32"));
const vectors = new Float32Array(
  vectorsBuffer.buffer.slice(
    vectorsBuffer.byteOffset,
    vectorsBuffer.byteOffset + vectorsBuffer.byteLength,
  ),
);
if (vectors.length !== chunks.length * manifest.dimensions)
  throw new Error("Embedding index does not match transcript chunks");
const itemById = new Map(items.map((item) => [item.id, item]));
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

const lexicalIndex = createLexicalIndex(chunks);

// Calibrated by eye for bge-small with CLS pooling: on-topic queries score ~0.71-0.89, off-topic ones ≤0.66.
const weakMatchScore = 0.7;
let modelReady = false;
// onnxruntime sizes its thread pool from the host's cores (hundreds on NIRD), which thrashes under a 1-CPU limit.
const sessionOptions = {
  intraOpNumThreads: Number(process.env.ORT_THREADS || 1),
  interOpNumThreads: 1,
};
const modelPromise = pipeline("feature-extraction", manifest.model, {
  dtype: "q8",
  revision: manifest.revision,
  session_options: sessionOptions,
}).then((model) => {
  modelReady = true;
  return model;
});
// Handle startup rejection immediately; requests still receive an error and use the browser fallback.
modelPromise.catch((error) =>
  console.error("Search model failed to load:", error.message),
);
async function denseRanking(query) {
  const extractor = await modelPromise;
  const output = await extractor(
    `Represent this sentence for searching relevant passages: ${query}`,
    { pooling: manifest.pooling || "mean", normalize: true },
  );
  const queryVector = output.data;
  const scores = new Array(chunks.length);
  for (let index = 0; index < chunks.length; index++) {
    let score = 0;
    const offset = index * manifest.dimensions;
    for (let dimension = 0; dimension < manifest.dimensions; dimension++)
      score += vectors[offset + dimension] * queryVector[dimension];
    scores[index] = { index, score };
  }
  return scores.sort((a, b) => b.score - a.score).slice(0, 100);
}

async function search(query) {
  const lexical = lexicalIndex.rank(queryTerms(query));
  const expansions = matchedAliases(query).map((alias) => aliases.get(alias));
  const dense = await denseRanking(
    expansions.length ? `${query} (${expansions.join("; ")})` : query,
  );
  const aliasWords = new Set(matchedAliases(query).flatMap(words));
  const unmatchedTerms = words(query).filter(
    (word) =>
      word.length >= 4 &&
      !stopWords.has(word) &&
      !aliasWords.has(word) &&
      !lexicalIndex.has(normalize(word)),
  );
  // A word nobody said plus a weak semantic match means the conference probably didn't cover it.
  const weak =
    unmatchedTerms.length > 0 && (dense[0]?.score || 0) < weakMatchScore;
  const fused = new Map();
  for (const ranking of [lexical, dense])
    ranking.forEach(({ index }, rank) => {
      fused.set(index, (fused.get(index) || 0) + 1 / (60 + rank + 1));
    });
  const byItem = new Map();
  const ranked = [...fused]
    .map(([index, score]) => {
      const chunk = chunks[index],
        item = itemById.get(chunk.itemId);
      return [index, score * (chunk.start < item.start + 35 ? 0.85 : 1)];
    })
    .sort((a, b) => b[1] - a[1]);
  // Ranked is sorted, so each talk's first chunk carries its best score.
  for (const [index, score] of ranked) {
    const chunk = chunks[index];
    if (!byItem.has(chunk.itemId))
      byItem.set(chunk.itemId, {
        item: itemById.get(chunk.itemId),
        score,
        moments: [],
      });
    const group = byItem.get(chunk.itemId);
    if (
      group.moments.length >= 3 ||
      group.moments.some((moment) => Math.abs(moment.start - chunk.start) < 45)
    )
      continue;
    group.moments.push({
      start: chunk.start,
      end: chunk.end,
      text: chunk.text,
    });
  }
  return {
    unmatchedTerms,
    weak,
    results: [...byItem.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, weak ? 5 : 18)
      .map(({ item, moments }) => ({
        id: item.id,
        title: item.title,
        speakers: item.speakers,
        session: item.session,
        room: item.room,
        date: item.date,
        videoUrl: item.videoUrl,
        moments,
      })),
  };
}

// In the container the built site is served from here too, so pages and search share one origin.
const staticDir = path.resolve(
  process.env.STATIC_DIR || path.join(root, "dist"),
);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".f32": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};
function serveStatic(pathname, response) {
  let file;
  try {
    file = path.join(staticDir, decodeURIComponent(pathname));
  } catch {
    return false;
  }
  if (!file.startsWith(staticDir + path.sep) && file !== staticDir)
    return false;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file = path.join(file, "index.html");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  response.writeHead(200, {
    "Content-Type":
      contentTypes[path.extname(file)] || "application/octet-stream",
    "Cache-Control": pathname.startsWith("/_astro/")
      ? "public, max-age=31536000, immutable"
      : [".html", ".json"].includes(path.extname(file))
        ? "no-cache"
        : "public, max-age=300",
  });
  fs.createReadStream(file).pipe(response);
  return true;
}

function sendJson(response, status, body) {
  response
    .writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
    .end(JSON.stringify(body));
}

http
  .createServer(async (request, response) => {
    let url;
    try {
      url = new URL(request.url, "http://localhost");
    } catch {
      sendJson(response, 400, { error: "Invalid request URL" });
      return;
    }
    if (url.pathname === "/health") {
      sendJson(response, modelReady ? 200 : 503, {
        ok: modelReady,
        items: items.length,
        chunks: chunks.length,
      });
      return;
    }
    if (url.pathname === "/api/search") {
      const origin = request.headers.origin;
      if (allowedOrigin === "*" || origin === allowedOrigin)
        response.setHeader(
          "Access-Control-Allow-Origin",
          allowedOrigin === "*" ? "*" : origin,
        );
      response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      if (request.method === "OPTIONS") {
        response.writeHead(204).end();
        return;
      }
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }
      const query = (url.searchParams.get("q") || "").trim().slice(0, 240);
      if (query.length < 2) {
        sendJson(response, 400, { error: "Enter at least two characters" });
        return;
      }
      try {
        sendJson(response, 200, { query, ...(await search(query)) });
      } catch (error) {
        console.error(error);
        sendJson(response, 500, { error: "Search is temporarily unavailable" });
      }
      return;
    }
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      serveStatic(url.pathname, response)
    )
      return;
    if (fs.existsSync(path.join(staticDir, "404.html"))) {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(path.join(staticDir, "404.html")).pipe(response);
      return;
    }
    sendJson(response, 404, { error: "Not found" });
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`TDWG explorer listening on ${port}`),
  );
