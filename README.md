# TDWG 2026 explorer

A playful, evidence-linked guide to the conference, live at https://tdwg2026.svc.gbif.no. Talk and theme pages are static. Search uses a small CPU service for hybrid keyword and semantic retrieval, with keyword-only search as a browser fallback. Video stays on Vimeo.

## Local setup

Requires Node 24 or newer.

```sh
npm ci
npm run data
npm run embed
npm run dev
```

Open the Astro URL printed by `npm run dev`. To use hybrid search locally, start `npm run search` in another terminal and set `PUBLIC_SEARCH_API_URL=http://localhost:8787` in `.env` before starting Astro. Without the API setting, search uses the static keyword fallback. `npm run build && npm run search` also serves the built site at http://localhost:8787, as in production.

The first `npm run embed` downloads a quantized BGE small model. Later runs reuse `model-cache/`. It generates transcript passage vectors, item vectors, related talks, the UMAP layout, and explainable cross-session connections in `public/data/`. Commit regenerated assets when the source data changes.

## Data flow

1. `derived/content_items.json`, `derived/themes.json`, `derived/recordings.json`, and the SRT files are the source data.
2. `npm run data` parses SRT cues and chunks each `source_segments` interval independently. It writes `public/data/chunks.json`, public item/theme metadata, and one cue file per talk.
3. `npm run embed` embeds chunks and item summaries with the same model used by the search service, saves normalized float32 vectors, computes nearest talks in the original embedding space, projects the items to 2D with UMAP, and selects cross-session connections with a shared specific theme.
4. Astro builds the static pages. The search service loads the generated assets into memory and uses BM25 plus dense similarity with reciprocal rank fusion. It needs no database.

The machine-produced summaries and transcripts may contain errors. Result pages show transcript passages and video times so visitors can check the source. The map is a discovery view; related talks come from the original embeddings, not 2D distances.

## Deployment

One Docker image serves both the built site and the search API on NIRD, so there is no CORS or separate static host. It holds no secrets: the image contains only the public data in `public/data`, the built pages and the embedding model.

GitHub Actions (`.github/workflows/image.yml`) builds `gbifnorway/tdwg2026:<short sha>` on every push to `main` that touches the app, and pushes it to Docker Hub. It needs the repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (a Docker Hub access token with push rights to `gbifnorway`). After pushing, run:

```sh
./scripts/deploy.sh
```

It waits for the image for the current commit, pins the tag in `../gitops/apps/tdwg2026/templates/deployment.yaml`, commits and pushes gitops, and applies the manifests to `gbif-no-ns8095k` on `nird-lmd`. `--build-local` builds and pushes from your machine instead; `--tag`, `--skip-gitops-commit` and `--skip-apply` cover partial runs. The ingress (`tdwg2026.svc.gbif.no`) follows the annotater pattern: nginx, with TLS from cert-manager.

Every Node step in the Dockerfile runs on the build machine's own platform and the final stage only copies files, so a local amd64 build on Apple Silicon needs no emulation.
