# Connector roadmap — API-first intake

**Status:** Active (supersedes discovery-as-spine for inventory)  
**Goal:** Pull job signals from open APIs and user capture first; run the existing Aperio match engine on normalized `RawFeedItem` rows. Autonomous scrape/discovery becomes fallback only.

**Design reference:** [connector-architecture.md](./connector-architecture.md)  
**Prior work:** [discovery-engine-roadmap.md](./discovery-engine-roadmap.md) (E1–E5 complete; demoted to fallback)

---

## Problem

E1–E5 improved *how* we find poll targets, but inventory still comes from RSS and HTML scrape. Remote boards validate; local aggregators 403 or return JS shells. The product behaves like a remote scraper.

APIs and user capture solve **access**. Matching, trust, geo gates, and explainability remain the product moat.

---

## Target architecture

```
SeekerProfile (city + roles + remotePreference)
    → resolveConnectors(profile)     ← deterministic, profile-driven
    → fetchConnector / fetchStream   ← RawFeedItem[]
    → parseOpportunity → scoreOpportunity → inbox

Optional fallback (only when connectors + capture yield nothing):
    → runSourceDiscovery (E1–E5 pipeline, demoted)
```

**Principle:** Connectors first, capture second, crawl last.

---

## Phases

| Phase | Scope | Exit criterion | Status |
|-------|-------|----------------|--------|
| **C1** | Connector module + Remotive adapter + `fetchStream` dispatch | Remotive returns items; unit tests pass without network | **Done** |
| **C2** | Profile-driven `resolveConnectors` wired into match pipeline | Hybrid profile gets Remotive items; onsite-only skips remote connectors | **Done** |
| **C3** | Adzuna DE + env credentials | Frankfurt profile returns local listings via API (no Indeed 403) | **Done** |
| **C4** | RemoteOK + Arbeitnow adapters | Three remote APIs normalized to one schema; dedupe across sources | **Done** |
| **C5** | BundesAPI / Arbeitsagentur connector | DE city gets gov inventory without list-page scrape | **Done** |
| **C6** | Demote discovery; fix memory bias | Onsite-only never gets remote memory probes; discovery runs only on empty inbox | **Done** |
| **C7** | Capture promoted; connector UI on Sources page | User sees connector vs scrape vs custom; API key settings for Adzuna | **Done** |
| **7A** | Global remote + APAC local presets | Adzuna geo expanded; Himalayas, Jobicy, MyCareersFuture adapters | **Done** |
| **7B** | Regional credentialed local presets | Reed, USAJobs, France Travail, Worknet + Settings UI | **Done** |

---

## 7B — Regional credentialed locals (Phase 7)

**Status:** Done

### Deliverables

1. **Reed.co.uk** adapter — UK profiles, HTTP Basic auth (`APERO_J_REED_API_KEY`)
2. **USAJobs** adapter — US profiles, API key + email headers
3. **France Travail** adapter — FR profiles, OAuth2 client credentials + offres search
4. **Worknet** adapter — KR profiles, XML list API via `APERO_J_WORKNET_AUTH_KEY`
5. Settings → API connectors panels for all four (local SQLite storage, env override)

### Exit test

```bash
pnpm --filter @aperio-j/discovery test
# London + Reed key → reed connector resolved
# Paris + France Travail keys → francetravail resolved
# Seoul + Worknet key → worknet resolved
```

---

## 7A — Global remote + APAC local (Phase 7)

**Status:** Done

### Deliverables

1. **Adzuna geo expansion** — city→country for FR, NL, ES, IT, CH, CA, IN, SG, PL, NZ, ZA, AT, BE, BR, MX (all `ADZUNA_COUNTRIES`)
2. **Himalayas** adapter — keyless search API with optional country filter + role search fallback
3. **Jobicy** adapter — keyless remote feed with optional `geo` slug (incl. JP/KR/CN/SG) + role search fallback
4. **MyCareersFuture** adapter — Singapore gov REST API (`api.mycareersfuture.gov.sg/v2/jobs`)

### Exit test

```bash
pnpm --filter @aperio-j/discovery test
# Singapore profile resolves mycareersfuture + jobicy(geo=singapore)
# Hybrid profile resolves himalayas + jobicy alongside existing remote bundle
```

---

## C1 — Connector foundation

### Deliverables

1. `@aperio-j/discovery/connectors/*` — types, registry, normalize helpers
2. `StreamKind` extended with `"connector"`
3. `fetchStream` dispatches `kind === "connector"` to registry
4. **Remotive** adapter (keyless JSON API)
5. Fixture mode for tests (`APERO_J_CONNECTOR_FIXTURES=true`)

### Exit test

```bash
pnpm --filter @aperio-j/discovery test
# remotive connector normalizes fixture → RawFeedItem[]
# fetchStream with kind=connector returns items
```

---

## C2 — Match pipeline wiring

### Deliverables

1. `resolveConnectorsForProfile(profile)` → `StreamConfig[]`
2. `match-service`: merge connector configs before `fetchAllStreams`
3. Connector streams use `discoveredVia: "connector:<id>"` (not persisted initially — ephemeral per run)
4. Skip remote connectors when `remotePreference === "onsite-only"`

### Exit test

- Profile: hybrid + Full-stack → inbox includes Remotive jobs
- Profile: onsite-only + Frankfurt → no Remotive source in fetch batch

---

## C3 — Adzuna (regional search)

### Deliverables

1. Adzuna adapter — `country`, `where`, `what` from profile
2. Env: `APERO_J_ADZUNA_APP_ID`, `APERO_J_ADZUNA_APP_KEY`
3. Country map: DE cities → `de`, UK → `gb`, US → `us`, AU → `au`
4. Rate-limit awareness (free tier ~250 calls/day)

### Exit test

- Frankfurt + full-stack → ≥1 Adzuna DE item in fetch results
- Snippet-only body acceptable for match (title + location + partial description)

---

## C4 — Remote API bundle

**Status:** Done

### Deliverables

1. RemoteOK adapter (User-Agent header, skip legal notice row)
2. Arbeitnow adapter (filter `remote` when preference requires)
3. Cross-connector dedupe on `title|company` (normalized)

### Exit test

- Hybrid profile: three remote connectors, deduped item count ≤ sum of raw

---

## C5 — Germany gov connector

### Deliverables

1. BundesAPI / Arbeitsagentur jobs-api adapter
2. City param from `primaryCity` (Berlin, Frankfurt, …)
3. Replaces scrape of `arbeitsagentur.de/jobsuche/` for DE profiles

### Exit test

- Frankfurt onsite profile: BundesAPI items present; no HTTP 403 from Indeed required

---

## C6 — Discovery demotion + memory fix

**Status:** Done

### Deliverables

1. `ensureStreamRegistry`: run discovery only if connector + registry fetch returned 0 items
2. `buildMemoryProbes`: skip `isRemoteBoardUrl` when `remotePreference === "onsite-only"`
3. `recordFetchMemoryFromResults`: don't boost remote boards for onsite-only profiles
4. Document fallback trigger in [discovery-engine-roadmap.md](./discovery-engine-roadmap.md)

### Exit test

- Onsite-only re-discovery does not add WeWorkRemotely
- Frankfurt run uses connectors before search probes

---

## C7 — UX + settings

**Status:** Done

### Deliverables

1. Sources page: badge `API` vs `RSS` vs `Scraped` vs `Custom`
2. Settings: optional Adzuna API key fields (stored local-only)
3. Fetch errors distinguish connector auth vs rate limit vs empty

---

## Connector priority matrix

| Connector | Remote | DE | UK | US | FR | KR | SG | Auth |
|-----------|--------|-----|-----|-----|-----|-----|-----|------|
| Remotive, RemoteOK, Arbeitnow | ✅ | partial | — | — | — | — | — | None |
| Himalayas, Jobicy | ✅ | — | — | — | — | geo | geo | None |
| Adzuna | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | App id/key |
| Bundesagentur | — | ✅ | — | — | — | — | — | None |
| MyCareersFuture | — | — | — | — | — | — | ✅ | None |
| Reed | — | — | ✅ | — | — | — | — | API key |
| USAJobs | — | — | — | ✅ | — | — | — | Key + email |
| France Travail | — | — | — | — | ✅ | — | — | OAuth client |
| Worknet | — | — | — | — | — | ✅ | — | Auth key |
| User capture | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | User |

CN/JP on-site remains **capture-first**; Worknet covers KR on-site when key configured.

---

## Environment variables

| Variable | Effect |
|----------|--------|
| `APERO_J_CONNECTORS_ENABLED` | Comma list override, e.g. `remotive,adzuna` |
| `APERO_J_CONNECTOR_FIXTURES` | Use local JSON fixtures instead of HTTP (tests) |
| `APERO_J_ADZUNA_APP_ID` | Adzuna application id |
| `APERO_J_ADZUNA_APP_KEY` | Adzuna application key |
| `APERO_J_REED_API_KEY` | Reed.co.uk API key |
| `APERO_J_USAJOBS_API_KEY` | USAJobs authorization key |
| `APERO_J_USAJOBS_EMAIL` | USAJobs user-agent email |
| `APERO_J_FRANCE_TRAVAIL_CLIENT_ID` | France Travail OAuth client id |
| `APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET` | France Travail OAuth client secret |
| `APERO_J_WORKNET_AUTH_KEY` | Worknet openapi auth key |
| `APERO_J_CONNECTOR_MAX_ITEMS` | Cap items per connector per run (default 50) |
| `APERO_J_DISCOVERY_FALLBACK` | Set `false` to disable scrape discovery when connectors return 0 items |

---

## Explicit non-goals (connectors phase)

- Indeed / LinkedIn / 51job / BOSS API integration (no public API)
- Republishing connector data to third-party job aggregators (violates Remotive ToS)
- Replacing user apply flow — link out to source URL
- LLM-based JD enrichment in connector path

---

## Relationship to Aperio (parent)

| Aperio | aperio-j connectors |
|--------|---------------------|
| Information streams + connectors | API connectors + capture |
| Portfolio fingerprints | SeekerProfile + artifacts |
| Living index | OpportunityRecord + MatchRun |
| Leads / Placement / Engage modes | Employment match inbox (future: shared connector schema) |

Long-term: shared `ConnectorDefinition` types between repos.

---

**Last updated:** 2026-07-04 (Phase 7B)
