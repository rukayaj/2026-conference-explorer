# Every step that runs Node happens on the build machine's own platform. The final
# stage only copies files, so a linux/amd64 build on a Mac never runs under emulation.

# Build the site and fetch the embedding model (both platform-independent).
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS build
WORKDIR /build
# The CPU runtime ships with the package; skip onnxruntime's optional CUDA download.
ENV ONNXRUNTIME_NODE_INSTALL=skip
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY scripts/warm-model.mjs ./scripts/
COPY public/data/manifest.json ./public/data/
RUN MODEL_CACHE_DIR=/build/model-cache node scripts/warm-model.mjs
COPY astro.config.mjs ./
COPY src ./src
COPY shared ./shared
COPY public ./public
# "/" makes the pages call the search API on their own origin.
ENV PUBLIC_SEARCH_API_URL=/
RUN npm run build

# Install production dependencies for the target platform, then drop what the server never loads:
# other platforms' onnxruntime binaries, and onnxruntime-web (transformers bundles its own copy).
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS deps
ARG TARGETARCH
WORKDIR /deps
ENV ONNXRUNTIME_NODE_INSTALL=skip
COPY package.json package-lock.json ./
RUN cpu=$([ "$TARGETARCH" = amd64 ] && echo x64 || echo "$TARGETARCH") \
 && npm ci --omit=dev --os=linux --cpu="$cpu" --libc=glibc --no-audit --no-fund \
 && rm -rf node_modules/onnxruntime-web \
 && find node_modules/onnxruntime-node/bin/napi-v6 -mindepth 2 -maxdepth 2 ! -path "*/linux/$cpu" -exec rm -rf {} +

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787 MODEL_CACHE_DIR=/app/model-cache STATIC_DIR=/app/dist DATA_DIR=/app/dist/data
COPY package.json ./
COPY --from=deps /deps/node_modules ./node_modules
COPY --from=build /build/model-cache ./model-cache
COPY server ./server
COPY shared ./shared
COPY --from=build /build/dist ./dist
USER node
EXPOSE 8787
CMD ["node", "server/index.mjs"]
