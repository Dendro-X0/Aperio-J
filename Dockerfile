FROM node:24-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN node scripts/build-selfhost.mjs
RUN node scripts/turso-schema-sql.mjs > schema.sql

FROM node:24-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=10000
ENV DATABASE_URL=file:/data/aperio-j.db
ENV APERIO_J_SCHEMA_SQL=/app/schema.sql

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/schema.sql ./schema.sql
COPY scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 10000
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
