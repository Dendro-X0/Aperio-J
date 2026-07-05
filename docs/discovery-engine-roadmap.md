# Discovery engine roadmap

**Status:** Active  
**Goal:** The engine discovers poll targets from profile inputs alone — city, roles, work mode — without requiring preset URL lists. Preset probe packs remain optional accelerators, not the primary path.

**Design reference:** [source-discovery-design.md](./source-discovery-design.md)

---

## Problem

Today Layer 1 (`expandSourceProbes` → `executeProbe` → validate → rank) still routes through **ProbePack registry lookup** first. For international cities, hardcoded `INTL_CITY_REGISTRY` entries run before search discovery. Remote RSS feeds validate easily; local list pages often fail validation. The result: the product behaves like a remote job scraper unless a city happens to be in the preset table.

---

## Target architecture

```
SeekerProfile (city + roles + remotePreference)
    → expandSourceProbes (profile-driven, deterministic)
    → executeProbe (multi-hop chain)
    → validate (tiered: candidate vs proven)
    → rank (trust + geo + intent + yield)
    → StreamRegistry
    → Layer 2 fetch → learning signals → targeted re-discovery
```

Preset packs attach as **fallback hints**, not the spine.

---

## Phases

| Phase | Scope | Exit criterion | Status |
|-------|-------|----------------|--------|
| **E1** | Profile-driven probe expansion; roles in search queries; registry demoted to fallback | Unknown city emits search probes first; role terms appear in queries; registry probes after search | **Done** |
| **E2** | Multi-hop chain: search → rss_autodiscover → seed_page_crawl on gov/edu hits | Berlin (or fixture city) discovers streams via search chain without registry hit | **Done** |
| **E3** | Tiered validation (candidate vs proven); deferred health | JS-blocked gov pages enter registry as candidates; promotion on successful fetch | **Done** |
| **E4** | Learning loop wired to targeted re-discovery | Dead stream triggers gap-focused re-probe; match yield adjusts weights | **Done** |
| **E5** | Cross-run discovery memory | Second run for same city reuses successful domain/query patterns | Done |

---

## E1 — Profile-driven probe expansion

### Changes

1. **Search queries include intent** — `desiredRoles` and `desiredIndustries` expand into additional search probes per sphere.
2. **Probe ordering** — for all city profiles:
   - `search_discovery` first
   - `rss_autodiscover` on pack seed pages / sphere-derived gov seeds
   - `registry_lookup` as fallback (end of list for `global-city`; after search for CN packs)
   - remote RSS last, gated by `remotePreference`
3. **CN metro packs** — keep curated registry streams but run search probes before registry for generic/unknown CN cities.

### Non-goals (E1)

- No `seed_page_crawl` implementation yet (E2)
- No validation tier split yet (E3)
- Preset entries not removed — only demoted in probe order

---

## E2 — Multi-hop discovery chain

When `executeSearchProbe` finds a gov/edu URL:

1. Spawn `rss_autodiscover` on that domain
2. Spawn `seed_page_crawl` (bounded: depth 2, max 30 URLs, `.gov.*` / `.edu.*` only)
3. Detect API/feed endpoints in HTML (`/api/`, `/feed`, JSON-LD)
4. Validate each candidate independently

Landing-page validation failure must not discard the domain.

---

## E3 — Tiered validation

### Changes (implemented)

1. **`validationTier` on `StreamCandidate`** — `"proven"` (items fetched) or `"candidate"` (trusted domain + geo/intent/job-hint sniff, zero parsed items).
2. **`resolveValidationTier()`** — gov/edu/company domains can enter as candidates; aggregators (Indeed, LinkedIn) still require parsed items.
3. **`partitionStreamCandidates()`** — splits discovery output into `enabled` (proven) and `deferred` (candidate).
4. **Persistence** — proven → `enabled: true`; candidate → `enabled: false`, still stored in registry.
5. **Match refresh** — `loadEnabledStreamConfigs` also fetches candidate-tier rows; successful fetch promotes to proven (`enabled: true`, `health: healthy`).

### Non-goals (E3)

- No automatic demotion of proven streams to candidate yet (E4 learning loop)
- UI does not yet distinguish candidate vs proven visually (optional follow-up)

---

## E4 — Learning loop

### Changes (implemented)

1. **`emptyFetchCount` + `userBlocked`** on `StreamRegistryEntry` — track consecutive empty fetches; user disable blacklists hostname.
2. **`stream-learning.ts`** — weight adjustment, gap analysis, dead threshold (3 empty polls).
3. **`gap-focused-probes.ts`** — targeted search probes when local/role gaps detected.
4. **`runTargetedRediscovery()`** — removes dead auto streams, runs gap-focused discovery, merges without wiping healthy streams.
5. **Match pipeline** — after fetch: targeted re-discovery on gaps; after match: updates `matchYield` + `learningWeight`.
6. **Discovery** — respects blocked domains from user-disabled sources.

### Signals

| Signal | Response |
|--------|----------|
| 0 items × 3 polls | `health: dead`, `enabled: false`, removed on targeted re-discovery |
| Items, 0 matches | Lower `learningWeight`, role-focused gap probes |
| Matches from source | Raise `learningWeight` |
| User disables source | `userBlocked: true`, domain excluded from future probes |

---

## E5 — Cross-run discovery memory ✅

Persist per-city patterns (successful domains, path patterns, queries) so subsequent runs reuse learned seeds before fresh search. Learned memory replaces authored registry over time.

**Delivered:** `DiscoveryMemory` table, `discovery-memory.ts` (seed/query recording, memory probes prepended via `mergeProbesWithMemory`), wired through `discoverAndPersistStreams`, targeted re-discovery, fetch/match yield recording, and cleared on location change.

---

## Out of scope (all phases)

- Unbounded web crawl + LLM site understanding
- LinkedIn/Indeed login automation
- Headless browser as default fetch path

---

## Environment knobs

| Variable | Effect |
|----------|--------|
| `APERO_J_SEARCH_PROBE=false` | Disable search discovery |
| `APERO_J_SEARCH_PROBE_QUERIES=2` | Queries per engine (default 2) |
| `APERO_J_SEARCH_PROBE_MAX=8` | Max search probes per run (default 8) |

---

**Last updated:** 2026-07-04

---

## Supersession — Connector phase (C1+)

E1–E5 improved autonomous source discovery. Production use showed that **inventory access** (APIs, user capture) matters more than better URL discovery for on-site and aggregator targets.

**New spine:** [connector-roadmap.md](./connector-roadmap.md) — API connectors first; E1–E5 pipeline runs only when `shouldRunScrapeDiscovery()` returns true (zero items from connectors + registry fetch). Set `APERO_J_DISCOVERY_FALLBACK=false` to disable scrape fallback entirely.
