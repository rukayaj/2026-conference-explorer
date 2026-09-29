import fs from "node:fs";
import path from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { UMAP } from "umap-js";

const root = path.resolve(import.meta.dirname, "..");
env.cacheDir = path.join(root, "model-cache");
const dataDir = path.join(root, "public", "data");
const items = JSON.parse(fs.readFileSync(path.join(dataDir, "items.json")));
const themes = JSON.parse(fs.readFileSync(path.join(dataDir, "themes.json")));
const themeById = new Map(themes.map((theme) => [theme.id, theme]));
const model = "Xenova/bge-small-en-v1.5";
const revision = "ea104dacec62c0de699686887e3f920caeb4f3e3";
// BGE is trained with CLS pooling.
const pooling = "cls";
const extractor = await pipeline("feature-extraction", model, {
  dtype: "q8",
  revision,
});

async function embed(texts, batchSize = 16) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const output = await extractor(batch, { pooling, normalize: true });
    const dims = output.dims.at(-1);
    for (let j = 0; j < batch.length; j++)
      vectors.push(Array.from(output.data.subarray(j * dims, (j + 1) * dims)));
    if (i % 160 === 0)
      console.log(
        `Embedded ${Math.min(i + batch.length, texts.length)}/${texts.length}`,
      );
  }
  return vectors;
}

const itemTexts = items.map((item) =>
  [
    item.title,
    item.summary,
    item.themes
      .map((id) => themeById.get(id)?.name)
      .filter(Boolean)
      .join(", "),
    item.keyPoints.slice(0, 3).join(" "),
  ]
    .filter(Boolean)
    .join(". ")
    .slice(0, 1800),
);
const itemVectors = await embed(itemTexts);

function similarity(a, b) {
  let score = 0;
  for (let i = 0; i < a.length; i++) score += a[i] * b[i];
  return score;
}

const related = {};
for (let i = 0; i < items.length; i++) {
  related[items[i].id] = items
    .map((item, j) => ({
      id: item.id,
      score: i === j ? -1 : similarity(itemVectors[i], itemVectors[j]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ id }) => id);
}
fs.writeFileSync(path.join(dataDir, "related.json"), JSON.stringify(related));

let state = 42;
const random = () =>
  (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
const umap = new UMAP({
  nComponents: 2,
  nNeighbors: 15,
  minDist: 0.18,
  random,
});
const coordinates = umap.fit(itemVectors);
const xs = coordinates.map(([x]) => x),
  ys = coordinates.map(([, y]) => y);
const xmin = Math.min(...xs),
  xmax = Math.max(...xs),
  ymin = Math.min(...ys),
  ymax = Math.max(...ys);
const mapPoints = coordinates.map(([x, y], i) => ({
  id: items[i].id,
  x: (x - xmin) / (xmax - xmin || 1),
  y: (y - ymin) / (ymax - ymin || 1),
}));
fs.writeFileSync(path.join(dataDir, "map.json"), JSON.stringify(mapPoints));

const connections = [];
for (let i = 0; i < items.length; i++) {
  for (let j = i + 1; j < items.length; j++) {
    if (
      items[i].session === items[j].session ||
      (items[i].room === items[j].room && items[i].date === items[j].date)
    )
      continue;
    const shared = items[i].themes.filter((theme) =>
      items[j].themes.includes(theme),
    );
    const specific = shared.filter(
      (id) => (themeById.get(id)?.content_item_count || 999) <= 16,
    );
    if (!specific.length) continue;
    const score = similarity(itemVectors[i], itemVectors[j]);
    if (score < 0.55) continue;
    connections.push({
      a: items[i].id,
      b: items[j].id,
      theme: specific[0],
      score,
    });
  }
}
connections.sort((a, b) => b.score - a.score);
const seen = new Map();
const varied = connections
  .filter((connection) => {
    const countA = seen.get(connection.a) || 0,
      countB = seen.get(connection.b) || 0;
    if (countA >= 2 || countB >= 2) return false;
    seen.set(connection.a, countA + 1);
    seen.set(connection.b, countB + 1);
    return true;
  })
  .slice(0, 80);
fs.writeFileSync(
  path.join(dataDir, "connections.json"),
  JSON.stringify(varied),
);
console.log(
  `Saved related talks, map positions and ${varied.length} connections for ${items.length} items.`,
);
