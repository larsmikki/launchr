FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY client/package.json client/package-lock.json* client/
COPY server/package.json server/package-lock.json* server/

RUN cd client && npm install && cd ../server && npm install

COPY client/ client/
COPY server/ server/

RUN cd client && npm run build
RUN cd server && npm run build

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json* server/

RUN cd server && npm install --omit=dev

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
