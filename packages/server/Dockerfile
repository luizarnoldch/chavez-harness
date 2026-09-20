FROM oven/bun:1

WORKDIR /app

# Workspace manifests first for better layer caching
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/cli/package.json ./packages/cli/

RUN bun install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

WORKDIR /app/packages/server

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
