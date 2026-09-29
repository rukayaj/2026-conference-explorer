import assert from "node:assert/strict";
import test from "node:test";
import {
  createLexicalIndex,
  queryTerms,
  tokens,
  matchedAliases,
} from "../shared/search.mjs";
import { createLocalSearch } from "../src/lib/local-search.js";
import {
  timeLabel,
  stampSeconds,
  videoLink,
  escapeHtml,
} from "../src/lib/format.js";

test("short acronyms and their expansions remain searchable", () => {
  const index = createLexicalIndex([
    { text: "AI helps biodiversity research." },
    { text: "Artificial intelligence for specimens." },
    { text: "Rainfall across Europe." },
  ]);
  assert.deepEqual(
    new Set(index.rank(queryTerms("AI")).map((hit) => hit.index)),
    new Set([0, 1]),
  );
  assert.deepEqual(matchedAliases("DwC-DP"), ["dwc-dp"]);
  assert.deepEqual(matchedAliases("rain"), []);
});

test("keyword search normalizes both captions and queries", () => {
  assert.deepEqual(tokens("digitisation"), tokens("digitization"));
  assert.deepEqual(
    tokens("digitising specimens"),
    tokens("digitizing specimen"),
  );
  const index = createLexicalIndex([
    { text: "Digitization of museum specimens." },
  ]);
  assert.equal(index.rank(queryTerms("specimen digitisation")).length, 1);
  assert.deepEqual(index.rank(queryTerms("What did TDWG say about the?")), []);
  assert.deepEqual(index.rank(queryTerms("unfindablexyz")), []);
  assert.deepEqual(createLexicalIndex([]).rank(queryTerms("AI")), []);
});

test("rare specific words rank ahead of repeated generic words", () => {
  const chunks = [
    { text: "biodiversity biodiversity biodiversity" },
    { text: "biodiversity Croissant" },
    ...Array.from({ length: 20 }, () => ({ text: "biodiversity research" })),
  ];
  assert.equal(
    createLexicalIndex(chunks).rank(queryTerms("biodiversity Croissant"))[0]
      .index,
    1,
  );
});

test("fallback groups at most 18 talks and deduplicates overlapping moments", () => {
  const items = Array.from({ length: 25 }, (_, index) => ({
    id: `talk-${index}`,
    start: 0,
  }));
  const chunks = items.flatMap((item) =>
    [40, 50, 100, 160, 220].map((start) => ({
      itemId: item.id,
      start,
      end: start + 30,
      text: "Artificial intelligence and specimens.",
    })),
  );
  const results = createLocalSearch(items, chunks)("AI");
  assert.equal(results.length, 18);
  for (const result of results) {
    assert.equal(result.moments.length, 3);
    assert.deepEqual(
      result.moments.map((moment) => moment.start),
      [40, 100, 160],
    );
  }
});

test("timestamp formatting rejects non-finite values and preserves zero", () => {
  assert.equal(timeLabel(Infinity), "0:00");
  assert.equal(timeLabel(-1), "0:00");
  assert.equal(timeLabel(3661.9), "1:01:01");
  assert.equal(stampSeconds("1:02:03"), 3723);
  assert.equal(stampSeconds("2:03"), 123);
  assert.equal(stampSeconds("invalid"), 0);
  assert.equal(
    videoLink("https://vimeo.com/123/hash#old", 0),
    "https://vimeo.com/123/hash#t=0s",
  );
});

test("transcript content is escaped before rendering as HTML", () => {
  assert.equal(
    escapeHtml("<img src=x onerror=\"alert(1)\"> & 'text'"),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;text&#39;",
  );
});
