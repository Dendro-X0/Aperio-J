# Connector architecture — implementation spec

**Status:** Draft (C1 prep)  
**Roadmap:** [connector-roadmap.md](./connector-roadmap.md)

---

## Overview

A **connector** is a thin adapter: HTTP (or fixture) → normalize → `RawFeedItem[]`. All connectors share one output shape so Layer 2 (parse → match) stays unchanged.

```
ConnectorDefinition
    .supports(profile) → boolean
    .buildQuery(profile) → ConnectorQuery
    .fetch(query, streamId) → RawFeedItem[]
```

---

## Types

### Core extension

```typescript
// @aperio-j/core
export type StreamKind = "rss" | "list_page" | "url_pattern" | "connector";
```

### Discovery package

```typescript
export type ConnectorId =
  | "remotive"
  | "remoteok"
  | "arbeitnow"
  | "adzuna"
  | "bundesagentur";

export interface ConnectorQuery {
  id: ConnectorId;
  /** Search terms derived from profile intent */
  search: string;
  /** Primary city label */
  city: string;
  /** ISO country code for regional APIs (de, gb, us, …) */
  country?: string;
  remotePreference: RemotePreference;
}

export interface ConnectorStreamConfig extends StreamConfig {
  kind: "connector";
  connectorId: ConnectorId;
  query: ConnectorQuery;
}
```

### Stream identity

Connectors use **ephemeral stream ids** per run (not persisted in Phase C2):

```
connector-{connectorId}-{hash(profile.id + query)}
```

`seedUrl` for traceability:

```
connector://remotive?search=full+stack
```

---

## Normalized row shape

All adapters map to `RawFeedItem`:

| Field | Source |
|-------|--------|
| `title` | Job title |
| `body` | Description snippet or salary + tags concatenated |
| `url` | Apply URL (must link back per source ToS) |
| `sourceId` | Ephemeral stream id |
| `fetchedAt` | ISO timestamp |

Optional enrichment happens in `parseOpportunity` (location, employer hint from title patterns).

---

## Registry

`packages/discovery/src/connectors/registry.ts`:

- Registers `ConnectorDefinition` by id
- `fetchConnector(config: ConnectorStreamConfig)` dispatches
- `listConnectorsForProfile(profile)` filters by `supports()`

---

## Profile → connector resolution

`resolveConnectorsForProfile(profile)` in `resolve-connectors.ts`:

```
1. If remotePreference !== "onsite-only":
     enable remotive, remoteok (cap 2)

2. If city maps to Adzuna country AND env keys present:
     enable adzuna with what=desiredRoles, where=city

3. If city in GERMAN_CITIES:
     enable bundesagentur

4. Build ConnectorQuery from intent.desiredRoles[0], primaryCity, remotePreference

5. Return ConnectorStreamConfig[] (0–4 entries typical)
```

Remote cap and country maps live in one file — auditable, no ML.

---

## Fetch dispatch

`fetch-streams.ts`:

```typescript
if (config.kind === "connector") {
  items = await fetchConnector(config as ConnectorStreamConfig);
} else if (config.kind === "list_page") {
  ...
}
```

---

## Match pipeline integration (C2)

`apps/web/src/lib/connector-service.ts`:

```typescript
export function loadConnectorStreamConfigs(profile: SeekerProfile): StreamConfig[] {
  return resolveConnectorsForProfile(profile);
}
```

`match-service.ts`:

```typescript
const registryConfigs = await loadEnabledStreamConfigs(profile.id);
const connectorConfigs = loadConnectorStreamConfigs(profile);
const streamConfigs = [...connectorConfigs, ...registryConfigs];
```

Connectors run **first** in the array so proven API data precedes stale registry entries.

Discovery fallback (`discoverAndPersistStreams`) moves behind:

```typescript
if (rssItems.length === 0 && connectorConfigs.length === 0) { ... }
// becomes
if (rssItems.length === 0) {
  const hadConnectors = connectorConfigs.length > 0;
  if (!hadConnectors || process.env.APERO_J_DISCOVERY_FALLBACK !== "false") {
    await discoverAndPersistStreams(profile);
  }
}
```

Implemented in C6 via `packages/discovery/src/discovery-fallback.ts`:

- `shouldRunScrapeDiscovery(fetchedItemCount)` — skip when connectors/registry already returned items
- `shouldRunInitialScrapeDiscovery()` — skip cron/empty-registry bootstrap when API connectors are configured
- `isScrapeDiscoveryFallbackEnabled()` — honors `APERO_J_DISCOVERY_FALLBACK=false`

---

## Testing strategy

| Layer | Approach |
|-------|----------|
| Normalize | Pure functions, fixture JSON per connector |
| Fetch | `APERO_J_CONNECTOR_FIXTURES=true` reads `fixtures/connectors/*.json` |
| Resolve | Unit tests per profile shape (onsite DE, hybrid US, CN capture-only) |
| Integration | Optional live test gated by `APERO_J_LIVE_CONNECTOR_TEST=1` |

Fixtures live in `packages/discovery/fixtures/connectors/`.

---

## Schema (optional, C3+)

Persist connector config in `StreamRegistryEntry` when user toggles connectors on Sources page:

```prisma
connectorId       String?
connectorParamsJson String?
```

C1–C2 use ephemeral configs only — no migration required yet.

---

## File layout

```
packages/discovery/src/connectors/
  types.ts
  normalize.ts
  registry.ts
  resolve-connectors.ts
  remotive.ts
  remoteok.ts          # C4
  arbeitnow.ts         # C4
  adzuna.ts            # C3
  bundesagentur.ts     # C5
  remotive.test.ts
  resolve-connectors.test.ts

packages/discovery/fixtures/connectors/
  remotive.json
  remoteok.json
  arbeitnow.json

apps/web/src/lib/
  connector-service.ts  # C2
```

---

## Adzuna query mapping (C3 prep)

```typescript
{
  country: "de",
  what: desiredRoles.join(" ") || "software",
  where: primaryCity,
  resultsPerPage: 20,
  maxDaysOld: 14,
}
```

Credentials from env only — never commit keys.

---

## Attribution requirements

| Source | Requirement |
|--------|-------------|
| Remotive | Link to remotive.com job URL; mention source |
| RemoteOK | Link to apply URL on remoteok.com |
| Adzuna | Follow Adzuna affiliate/display guidelines |
| BundesAPI | Open data — cite BundesAPI / Arbeitsagentur |

Store `sourceSite` via `parseOpportunity` from apply URL hostname.

---

**Last updated:** 2026-07-04
