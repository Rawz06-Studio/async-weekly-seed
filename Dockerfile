# Base image
FROM node:22-alpine AS build

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Install pnpm for production install if needed, or just copy node_modules
RUN npm install -g pnpm

# Copy built assets and necessary files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/views ./views
COPY --from=build /app/public ./public

# The database file should be persisted, so we might want to use a volume.
# For now, we just ensure the app can run.
# SQLite file will be created at /app/database.sqlite by default in AppModule

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
