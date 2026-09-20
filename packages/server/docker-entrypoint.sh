#!/bin/sh
set -e

echo "Running database migrations..."
bun run db:migrate

echo "Starting server on port ${PORT:-3000}..."
exec bun run start
