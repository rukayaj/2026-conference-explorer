# TDWG 2026 explorer

A playful, evidence-linked guide to the conference. It's a fully static site. Visitors can browse all talks by title, speaker, day and room, and explore them by theme, on a map, or at random. Search runs in the browser: it's keyword search over the transcripts, and it downloads its index on the first query. Video stays on Vimeo.

## Local setup

Requires Node 24 or newer.

```sh
npm ci
npm run dev
```

`npm run format:check && npm test && npm run verify && npm run build` checks formatting, search behavior, generated data and static pages; `npm run format` fixes formatting. The generated data in `public/data/` is committed, so only rebuild it when the source data changes (see below).

## Data flow

1. `source/` holds the original inputs: the SRT transcripts, the programme (`program-data.js`), and the per-recording extraction output in `source/output/`. It also keeps what produced that output: `AGENT_TASK.md`, `transcript-prompt.txt` and the `json-template.json` schema.
2. `derived/` holds the conference-wide dataset built from the extraction output with `dataset-prompt.txt` (`content_items.json`, `themes.json`, `recordings.json`). `theme_mapping.json` and `validation_report.json` record how themes were merged and what was checked. `curation/` holds hand-picked surprise moments, still times, and session openings worth hearing (`session-openings.json`).
3. `npm run data` parses the SRT cues and chunks each `source_segments` interval independently. It writes `public/data/chunks.json`, public item/theme metadata, and one cue file per talk. It adds each talk's scheduled time, conference track and abstract from `source/program-data.js`. The abstracts go in `abstracts.json` because the search, map and surprise pages download `items.json`. Each curated session opening is linked from the talks it introduces. Openings marked `searchable` are also added to `chunks.json` and show up as their own search results. The build fails if an opening overlaps a talk or doesn't end before its first talk. To update `program-data.js`, copy it from the `tdwg-2026-detailed-program` project and rerun this step.
4. `npm run embed` embeds each talk's title, summary, themes and key points with a quantized BGE small model. It writes the nearest talks, the UMAP map layout, and cross-session connections that share a specific theme. The first run downloads the model to `model-cache/`.
5. `node scripts/stills.mjs` saves one video still per talk to `public/stills/`, taken 45 seconds in through the Vimeo player stream. It needs `yt-dlp`, `ffmpeg` and `cwebp` (`brew install ffmpeg yt-dlp`) and skips stills that already exist. Set a better frame time for a talk in `curation/still-times.json`, then rerun with `--force <talk id>`.
6. Astro builds the static pages. The search page loads `items.json` and `chunks.json` and ranks passages with BM25 (`src/lib/search.js`). It uses light stemming for British spellings and plurals, and expands acronyms such as DwC and DiSSCo.

The machine-produced summaries and transcripts may contain errors. Result pages show transcript passages and video times so visitors can check the source. The map is a discovery view; related talks come from the original embeddings, not 2D distances.

## Living Data 2025 pilot

Selected 2026 talk pages include a “Go back to 2025” panel with reviewed Data
Package comparisons, timestamped video links and the caption passages from
both years. Continuing work, open questions and related examples have distinct
labels. The 2026 play buttons seek the existing player; 2025 links open YouTube.
The panel works as a native disclosure, including without JavaScript.

`src/components/TimeTravel.astro` reads the reviewed comparisons directly from
`derived/living-data-2025/data-package/comparison_links.json` at build time.
Only caption-checked comparisons are displayed; candidate suggestions are not
used. The pilot remains separate from the 2026 search and theme datasets.
See `source/living-data-2025/data-package/README.md` for provenance and the
comparison build/validation commands.

## Deployment

`.github/workflows/pages.yml` runs the formatting check, tests and data check, builds the site, and publishes it to GitHub Pages on every push to `main`. The site URL and base path come from the repository's Pages settings, so a custom domain needs no code change.
