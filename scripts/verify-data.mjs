import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(root, 'public', 'data');
const sourceItems = JSON.parse(fs.readFileSync(path.join(root, 'derived', 'content_items.json')));
const items = JSON.parse(fs.readFileSync(path.join(dataDir, 'items.json')));
const chunks = JSON.parse(fs.readFileSync(path.join(dataDir, 'chunks.json')));
const themes = JSON.parse(fs.readFileSync(path.join(dataDir, 'themes.json')));
const byId = new Map(sourceItems.map((item) => [item.id, item]));
const seconds = (timestamp) => timestamp.split(':').map(Number).reduce((total, part) => total * 60 + part, 0);
const errors = [];

for (const chunk of chunks) {
  const item = byId.get(chunk.itemId);
  if (!item) { errors.push(`Unknown item: ${chunk.itemId}`); continue; }
  if (!item.source_segments.some((segment) => chunk.start >= seconds(segment.start_timestamp) - 1 && chunk.end <= seconds(segment.end_timestamp) + 2)) {
    errors.push(`Chunk outside source segment: ${chunk.id}`);
  }
  if (chunk.end < chunk.start || !chunk.text.trim()) errors.push(`Empty or reversed chunk: ${chunk.id}`);
}
for (const item of items) {
  if (!fs.existsSync(path.join(dataDir, 'cues', `${item.id}.json`))) errors.push(`Missing transcript: ${item.id}`);
  if (!item.videoUrl) errors.push(`Missing video: ${item.id}`);
  if (!fs.existsSync(path.join(root, 'public', 'stills', `${item.id}.webp`))) errors.push(`Missing still (run node scripts/stills.mjs): ${item.id}`);
}
if (fs.existsSync(path.join(dataDir, 'manifest.json'))) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json')));
  if (manifest.chunks !== chunks.length || manifest.items !== items.length) errors.push('Embedding manifest is stale');
  for (const [file, count] of [['passages.f32', chunks.length], ['items.f32', items.length]]) {
    const size = fs.statSync(path.join(dataDir, file)).size;
    if (size !== count * manifest.dimensions * 4) errors.push(`Wrong vector size: ${file}`);
  }
  for (const [file, count] of [['map.json', items.length]]) {
    if (JSON.parse(fs.readFileSync(path.join(dataDir, file))).length !== count) errors.push(`Wrong entry count: ${file}`);
  }
}
if (errors.length) { console.error(errors.slice(0, 30).join('\n')); process.exit(1); }
console.log(`Verified ${items.length} items, ${themes.length} themes, and ${chunks.length} chunks${fs.existsSync(path.join(dataDir, 'manifest.json')) ? ' with embeddings' : ''}.`);
