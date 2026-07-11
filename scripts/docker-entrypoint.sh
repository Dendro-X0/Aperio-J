#!/bin/sh
set -e

if echo "$DATABASE_URL" | grep -qE '^libsql://|https://[^/]+\.turso\.io'; then
  echo "docker-entrypoint: remote libSQL (Turso) — schema bootstraps on first request"
  exec node apps/web/server.js
fi

DB_PATH="${DATABASE_URL#file:}"
if [ -z "$DB_PATH" ] || [ "$DB_PATH" = "$DATABASE_URL" ]; then
  echo "docker-entrypoint: DATABASE_URL must be file:… or libsql://…"
  exit 1
fi

mkdir -p "$(dirname "$DB_PATH")"

if [ ! -f "$DB_PATH" ]; then
  echo "docker-entrypoint: initializing SQLite at $DB_PATH"
  sqlite3 "$DB_PATH" < /app/schema.sql
fi

exec node apps/web/server.js
