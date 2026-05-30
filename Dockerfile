FROM node:26-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY tsconfig.base.json ./
COPY server/ server/
COPY client/ client/
RUN npm run build -w client
RUN npm run build -w server

# --- Production stage ---
FROM node:26-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci -w server --omit=dev

COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/client/dist client/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3020
ENV DATA_DIR=/app/data

EXPOSE 3020

HEALTHCHECK --interval=5m --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3020/api/settings || exit 1

CMD ["node", "server/dist/index.js"]
