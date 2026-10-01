FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/cli/package.json ./packages/cli/
COPY packages/web/package.json ./packages/web/

RUN bun install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

WORKDIR /app/packages/web

RUN bun run build

FROM node:24-slim

WORKDIR /app

COPY --from=build /app /app

WORKDIR /app/packages/web

ENV NODE_ENV=production \
    PORT=4321

EXPOSE 4321

CMD ["node", "./scripts/serve.mjs"]
