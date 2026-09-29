export const stopWords = new Set(
  "a an and are as at be by can did do for from how in is it of on or the their this to was were what when where who why with about say said tdwg".split(
    " ",
  ),
);
// Keys are matched against the raw query, so hyphenated keys work. The captions are
// American-spelled ASR, which writes DiSSCo as "disco".
export const aliases = new Map([
  ["dwc", "darwin core"],
  ["dwc-dp", "darwin core data package"],
  ["dissco", "distributed system of scientific collections disco"],
  ["mids", "minimum information about a digital specimen"],
  ["ai", "artificial intelligence"],
  ["llm", "large language model"],
]);
export const words = (text) =>
  text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
// Just enough stemming to bridge British spellings and plurals, applied to both sides.
export function normalize(word) {
  return word
    .replace(/isation/, "ization")
    .replace(/ization$/, "ize")
    .replace(/([iy])s(e|ed|es|ing)$/, "$1z$2")
    .replace(/ies$/, "y")
    .replace(/([^s])s$/, (match, previous) =>
      word.length > 3 ? previous : match,
    );
}
export function tokens(text) {
  return words(text)
    .filter((word) => word.length > 1 && !stopWords.has(word))
    .map(normalize);
}
export function matchedAliases(query) {
  const lower = query.toLowerCase();
  const found = [...aliases.keys()].filter((alias) =>
    new RegExp(`(^|[^\\p{L}\\p{N}])${alias}($|[^\\p{L}\\p{N}])`, "u").test(
      lower,
    ),
  );
  return found.filter(
    (alias) => !found.some((other) => other !== alias && other.includes(alias)),
  );
}
export function queryTerms(query) {
  const terms = tokens(query);
  for (const alias of matchedAliases(query))
    terms.push(...tokens(aliases.get(alias)));
  return [...new Set(terms)];
}

export function createLexicalIndex(chunks) {
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
  const averageLength =
    lengths.reduce((sum, length) => sum + length, 0) / lengths.length;

  function rank(terms, limit = 100) {
    const scores = new Float32Array(chunks.length);
    for (const term of terms) {
      const list = postings.get(term);
      if (!list) continue;
      const idf = Math.log(
        1 + (chunks.length - list.length + 0.5) / (list.length + 0.5),
      );
      for (const [index, frequency] of list) {
        const denominator =
          frequency + 1.2 * (0.25 + (0.75 * lengths[index]) / averageLength);
        scores[index] += (idf * frequency * 2.2) / denominator;
      }
    }
    return Array.from(scores, (score, index) => ({ index, score }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  return { rank, has: (term) => postings.has(term) };
}
