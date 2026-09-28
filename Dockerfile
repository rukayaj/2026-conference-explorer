FROM node:24-bookworm-slim AS site
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY astro.config.mjs ./
COPY src ./src
COPY public ./public
# "/" makes the pages call the search API on their own origin.
ENV PUBLIC_SEARCH_API_URL=/
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server ./server
COPY --chown=node:node scripts/warm-model.mjs ./scripts/warm-model.mjs
COPY --chown=node:node public/data ./public/data
COPY --chown=node:node --from=site /build/dist ./dist
ENV NODE_ENV=production PORT=8787 MODEL_CACHE_DIR=/app/model-cache
RUN node scripts/warm-model.mjs
EXPOSE 8787
CMD ["node", "server/index.mjs"]
