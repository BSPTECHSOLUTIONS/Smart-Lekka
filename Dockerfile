# ============================================================
# Smart Lekka — Multi-stage Dockerfile
# Stage 1: Build frontend + API
# Stage 2: Production runtime (nginx + node)
# ============================================================

FROM node:24-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.json tsconfig.base.json ./

COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/tractor-tracker/ ./artifacts/tractor-tracker/

RUN pnpm install --frozen-lockfile

RUN pnpm run typecheck:libs

RUN pnpm --filter @workspace/tractor-tracker run build

RUN pnpm --filter @workspace/api-server run build

FROM node:24-alpine AS production

RUN npm install -g pnpm@9

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.json tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/artifacts/api-server/dist/ ./artifacts/api-server/dist/

RUN apk add --no-cache nginx

COPY --from=builder /app/artifacts/tractor-tracker/dist/ /usr/share/nginx/html/

COPY deploy/nginx.conf /etc/nginx/nginx.conf

COPY deploy/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
