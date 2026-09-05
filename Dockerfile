# ---- Builder: compile native deps (better-sqlite3) ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# ---- Runtime: slim image, no build tools ----
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app /app

RUN mkdir -p /app/data /app/uploads
VOLUME ["/app/data", "/app/uploads"]

EXPOSE 3000
CMD ["node", "server.js"]
