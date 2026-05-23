# Build stage
FROM node:22-alpine AS build

WORKDIR /app

RUN npm install -g pnpm

# Workspace manifests only (no source yet)
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json

RUN pnpm install --filter web --frozen-lockfile

# Copy web source and build
COPY web ./web

WORKDIR /app/web

# NUXT_PUBLIC_API_BASE is baked at build time for client-side bundles
# Override at runtime via env var for SSR (API_BASE_URL)
ARG NUXT_PUBLIC_API_BASE=http://localhost:3000/api
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE

RUN pnpm build

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/web/.output ./.output

EXPOSE 3001

ENV NITRO_PORT=3001
ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
