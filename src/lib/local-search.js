import { createLexicalIndex, queryTerms } from "../../shared/search.mjs";

export function createLocalSearch(items, chunks) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const index = createLexicalIndex(chunks);
  return (query) => {
    const ranked = index
      .rank(queryTerms(query), chunks.length)
      .map(({ index, score }) => {
        const chunk = chunks[index],
          item = byId.get(chunk.itemId);
        return {
          chunk,
          item,
          score: score * (chunk.start < item.start + 35 ? 0.85 : 1),
        };
      })
      .sort((a, b) => b.score - a.score);
    const groups = new Map();
    for (const { chunk, item } of ranked) {
      if (!groups.has(item.id)) {
        if (groups.size >= 18) continue;
        groups.set(item.id, { ...item, moments: [] });
      }
      const group = groups.get(item.id);
      if (
        group.moments.length < 3 &&
        !group.moments.some(
          (moment) => Math.abs(moment.start - chunk.start) < 45,
        )
      ) {
        group.moments.push({
          start: chunk.start,
          end: chunk.end,
          text: chunk.text,
        });
      }
    }
    return [...groups.values()];
  };
}

// Share in-flight downloads, but allow a failed download to be retried.
export function loadLocalSearch(base) {
  return Promise.all(
    ["items.json", "chunks.json"].map(async (name) => {
      const response = await fetch(`${base}data/${name}`);
      if (!response.ok) throw new Error(`Could not load ${name}`);
      return response.json();
    }),
  ).then(([items, chunks]) => createLocalSearch(items, chunks));
}
