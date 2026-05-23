# Build stage
FROM node:22-alpine AS build

WORKDIR /app

RUN npm install -g pnpm

# Workspace manifests only (no source yet)
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json

RUN pnpm install --filter async-weekly-seed --frozen-lockfile
RUN pnpm approve-builds

# Copy api source and build
COPY api ./api

WORKDIR /app/api

RUN pnpm build

# Create self-contained production bundle
WORKDIR /app
RUN pnpm --filter async-weekly-seed deploy --prod /prod

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY --from=build /prod/node_modules ./node_modules
COPY --from=build /prod/package.json ./package.json
COPY --from=build /app/api/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
