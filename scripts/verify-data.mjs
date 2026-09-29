import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(root, "public", "data");
const sourceItems = JSON.parse(
  fs.readFileSync(path.join(root, "derived", "content_items.json")),
);
const items = JSON.parse(fs.readFileSync(path.join(dataDir, "items.json")));
const chunks = JSON.parse(fs.readFileSync(path.join(dataDir, "chunks.json")));
const themes = JSON.parse(fs.readFileSync(path.join(dataDir, "themes.json")));
const openings = JSON.parse(
  fs.readFileSync(path.join(dataDir, "openings.json")),
);
const byId = new Map(sourceItems.map((item) => [item.id, item]));
const seconds = (timestamp) =>
  timestamp
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
const errors = [];

for (const chunk of chunks) {
  const item = byId.get(chunk.itemId);
  if (!item) {
    errors.push(`Unknown item: ${chunk.itemId}`);
    continue;
  }
  const opening = openings[chunk.openingId];
  if (chunk.openingId && opening?.itemId !== chunk.itemId) {
    errors.push(`Unknown opening: ${chunk.openingId}`);
    continue;
  }
  const ranges = opening
    ? [[opening.start, opening.end]]
    : item.source_segments.map((segment) => [
        seconds(segment.start_timestamp),
        seconds(segment.end_timestamp),
      ]);
  if (
    !ranges.some(
      ([start, end]) => chunk.start >= start - 1 && chunk.end <= end + 2,
    )
  ) {
    errors.push(`Chunk outside source segment: ${chunk.id}`);
  }
  if (chunk.end < chunk.start || !chunk.text.trim())
    errors.push(`Empty or reversed chunk: ${chunk.id}`);
}
for (const item of items) {
  if (!fs.existsSync(path.join(dataDir, "cues", `${item.id}.json`)))
    errors.push(`Missing transcript: ${item.id}`);
  if (!item.videoUrl) errors.push(`Missing video: ${item.id}`);
  if (item.openingId && !openings[item.openingId])
    errors.push(`Unknown opening: ${item.openingId}`);
  if (!fs.existsSync(path.join(root, "public", "stills", `${item.id}.webp`)))
    errors.push(`Missing still (run node scripts/stills.mjs): ${item.id}`);
}
const mapPoints = JSON.parse(fs.readFileSync(path.join(dataDir, "map.json")));
if (mapPoints.length !== items.length)
  errors.push("Map is stale (run npm run embed)");
const related = JSON.parse(fs.readFileSync(path.join(dataDir, "related.json")));
if (items.some((item) => !related[item.id]))
  errors.push("Related talks are stale (run npm run embed)");
if (errors.length) {
  console.error(errors.slice(0, 30).join("\n"));
  process.exit(1);
}
console.log(
  `Verified ${items.length} items, ${themes.length} themes, ${chunks.length} chunks, and ${Object.keys(openings).length} session openings.`,
);
