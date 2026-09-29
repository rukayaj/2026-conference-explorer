# TDWG 2026 explorer

A playful, evidence-linked guide to the conference. It's a fully static site. Visitors can browse all talks by title, speaker, day and room, and explore them by theme, on a map, or at random. Search runs in the browser: it's keyword search over the transcripts, and it downloads its index on the first query. Video stays on Vimeo.

## Local setup

Requires Node 24 or newer.

```sh
npm ci
npm run dev
```

`npm test && npm run verify && npm run build` checks search behavior, generated data and static pages. The generated data in `public/data/` is committed, so only rebuild it when the source data changes (see below).

## Data flow

1. `source/` holds the original inputs: the SRT transcripts, the programme (`program-data.js`), and the per-recording extraction output with the prompts and schema that produced it.
2. `derived/` holds the conference-wide dataset built from them (`content_items.json`, `themes.json`, `recordings.json`). `curation/` holds hand-picked surprise moments and still times.
3. `npm run data` parses the SRT cues and chunks each `source_segments` interval independently. It writes `public/data/chunks.json`, public item/theme metadata, and one cue file per talk.
4. `npm run embed` embeds each talk's title, summary, themes and key points with a quantized BGE small model. It writes the nearest talks, the UMAP map layout, and cross-session connections that share a specific theme. The first run downloads the model to `model-cache/`.
5. `node scripts/stills.mjs` saves one video still per talk to `public/stills/`, taken 45 seconds in through the Vimeo player stream. It needs `yt-dlp`, `ffmpeg` and `cwebp` (`brew install ffmpeg yt-dlp`) and skips stills that already exist. Set a better frame time for a talk in `curation/still-times.json`, then rerun with `--force <talk id>`.
6. Astro builds the static pages. The search page loads `items.json` and `chunks.json` and ranks passages with BM25 (`src/lib/search.js`). It uses light stemming for British spellings and plurals, and expands acronyms such as DwC and DiSSCo.

The machine-produced summaries and transcripts may contain errors. Result pages show transcript passages and video times so visitors can check the source. The map is a discovery view; related talks come from the original embeddings, not 2D distances.

## Deployment

`.github/workflows/pages.yml` runs the tests and data check, builds the site, and publishes it to GitHub Pages on every push to `main`. The site URL and base path come from the repository's Pages settings, so a custom domain needs no code change.
