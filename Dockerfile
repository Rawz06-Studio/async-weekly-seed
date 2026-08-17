# Base image
FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Approved builds for certain dependencies (required by pnpm v10+)
RUN pnpm approve-builds

# Copy source code
COPY . .

# Ensure public directory exists even if empty (avoid COPY failure)
RUN mkdir -p public

# Build the application
RUN npm run build

# Production image
FROM node:24-alpine

WORKDIR /app

# Copy built assets and necessary files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/views ./views
COPY --from=build /app/public ./public

# PostgreSQL connection details should be provided via environment variables at runtime.

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
