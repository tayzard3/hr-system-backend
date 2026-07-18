# syntax=docker/dockerfile:1

# ---- deps: full install (incl. devDependencies) for building -------------
FROM node:22-alpine AS deps
ENV HUSKY=0
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build: compile TypeScript -> dist/ -----------------------------------
FROM deps AS build
COPY . .
RUN npm run build

# ---- prod-deps: production-only node_modules ------------------------------
# --ignore-scripts: the "prepare" lifecycle script runs husky, which is a
# devDependency and won't be installed here — skip lifecycle scripts entirely.
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---- runner: final, minimal image -----------------------------------------
FROM node:22-alpine AS runner

# Install tzdata and set timezone to Asia/Bangkok
RUN apk add --no-cache tzdata \
    && ln -sf /usr/share/zoneinfo/Asia/Bangkok /etc/localtime \
    && echo "Asia/Bangkok" > /etc/timezone

# Set environment variables
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
ENV NODE_ENV=production

WORKDIR /app

# Production-only dependencies (no eslint/prettier/husky/nodemon/etc.)
COPY --from=prod-deps /app/node_modules ./node_modules
# Compiled output only — no TypeScript source in the final image
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Expose the app port
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/_health || exit 1

# Start the compiled app directly (no ts-node/nodemon in the final image)
CMD ["node", "dist/server.js"]
