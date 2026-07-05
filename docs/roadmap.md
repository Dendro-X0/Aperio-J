# aperio-j roadmap

## Phase 0 — Engine core ✅

| # | Deliverable | Status |
|---|-------------|--------|
| 0.1 | Vision + onboarding + matching specs | Done |
| 0.2 | `@aperio-j/core` types | Done |
| 0.3 | `@aperio-j/discovery` parse + classify + red flags | Done |
| 0.4 | `@aperio-j/matcher` score + explain | Done |
| 0.5 | Golden fixtures + tests | Done |

## Phase 1 — Runnable product shell ✅

| # | Deliverable | Status |
|---|-------------|--------|
| 1.1 | `apps/web` — single-page Profile settings (`/settings`) | **Done** |
| 1.2 | SQLite + Prisma — SeekerProfile, Opportunity, MatchRun | **Done** |
| 1.3 | RSS stream fetcher + cron | **Done** (6h match / 7d re-discovery) |
| 1.4 | Inbox UI — ranked matches + explanations | **Done** |
| 1.5 | Shenzhen/Guangdong public stream pack (config) | **Done** — aggregators + gov; see [probe-packs.md](./probe-packs.md) |

---

## Phase 2 — Autonomous source discovery ✅

See **[source-discovery-design.md](./source-discovery-design.md)**.

| # | Deliverable | Status |
|---|-------------|--------|
| 2a | `@aperio-j/probe` — ProbePack + `expandSourceProbes` | **Done** |
| 2b | RSS autodiscover + `validateStreamCandidate` | **Done** |
| 2c | StreamRegistry + wire match pipeline | **Done** |
| 2d | `list_page` fetcher + stream health + re-discovery | **Done** |
| 2d+ | `list_page` detail fetch (second hop) | **Done** |
| 2e | Source discovery cron | **Done** — see [cron.md](./cron.md) |
| 2f | User custom stream URL (Aperio parity) | **Done** — POST `/api/sources` |

**Product model:** auto-discovery **bootstraps** streams; users **own** their registry via custom URLs. ProbePacks are optional accelerators, not a closed list.

---

## Phase 3 — Trust + geo (in progress)

| # | Deliverable | Status |
|---|-------------|--------|
| 3.1 | Expanded CN labor-agency pattern pack | **Done** — hard exclude vs warn tiers |
| 3.2 | Geocode primary city + district extract | **Partial** — generic CN city + profile corpus match |
| 3.3 | Commute radius (Mapbox or ORS) | Planned |
| 3.4 | User feedback → weight tuning | **Done** — inbox actions, category down-rank, stream weights |

---

## Phase 4 — OSS scale

| # | Deliverable | Status |
|---|-------------|--------|
| 4.1 | Capture URL — paste any listing | **Done** — POST `/api/capture` |
| 4.2 | Multi-user auth | Planned |
| 4.3 | Daily email digest + i18n |
| 4.4 | Community `probe-packs/` per locale |
| 4.5 | Optional: shared fetch logic from Aperio `@aperio/sources` |

---

## Phase 5 — Local-first shell (in progress)

See **[platform-vision.md](./platform-vision.md)**.

| # | Deliverable | Status |
|---|-------------|--------|
| 5.1 | Tauri v2 — desktop shell wrapping `apps/web` | **Done** — `apps/desktop`, `pnpm dev:desktop` |
| 5.2 | Embedded SQLite + background refresh | Partial — desktop uses app data dir SQLite |
| 5.3 | Export/import Profile + streams (no cloud) | **Done** — Settings → Local data; `GET/POST /api/data/*` |
| 5.4 | i18n UI + locale rule packs | **Done** — UI catalogs + engine JSON ([i18n.md](./i18n.md), [engine-locales.md](./engine-locales.md)) |
| 5.5 | Tauri mobile targets | **Scaffold** — Android init, `pnpm dev:android`; release engine TBD ([desktop-mobile.md](./desktop-mobile.md)) |
| 5.6 | Marketplace UI redesign (search, filters, dashboard Profile) | **Done** — Phases A–E; [ui-redesign.md](./ui-redesign.md), [frontend-spec.md](./frontend-spec.md) |

## Phase 5.7 — UX polish ✅ (core)

Post–marketplace UX audit ([frontend-spec.md](./frontend-spec.md)).

| # | Deliverable | Status |
|---|-------------|--------|
| 5.7.1 | Profile unsaved-changes guard (`beforeunload` + leave dialog) | **Done** |
| 5.7.2 | Match score tiers (Strong / Fair / Weak) on inbox cards + `aria-label` | **Done** |
| 5.7.3 | Suppress lone low-severity poster-unknown cautions on cards | **Done** |
| 5.7.4 | Split **Save** vs **Save & refresh matches** on profile | **Done** |
| 5.7.5 | Dedupe page titles (breadcrumb-only); inbox locale note for listing language | **Done** |
| 5.7.6 | Refresh progress status bar; sources badge links to `/sources` | **Done** |
| 5.7.7 | **Start over** — reset profile + local data, retry initial setup | **Done** |
| 5.7.8 | Clickable completeness chips; editable trust prefs | Planned |
| 5.7.9 | Streaming match progress (per-source) | Planned |
| 5.8 | Skippable onboarding + discovery gate (industry + occupation) | **Done** |
| 5.8.1 | Multi-city tags + IP city detect | **Done** |
| 5.8.2 | Industry / occupation fields in portfolio | **Done** |

---

## Phase 6 — API connectors (active)

**Supersedes discovery-as-spine for job inventory.** See **[connector-roadmap.md](./connector-roadmap.md)** and **[connector-architecture.md](./connector-architecture.md)**.

| # | Deliverable | Status |
|---|-------------|--------|
| 6.1 | Connector module + Remotive adapter | **Done** — C1 |
| 6.2 | Profile-driven resolution in match pipeline | **Done** — C2 |
| 6.3 | Adzuna DE/regional connector | **Done** — C3 |
| 6.4 | RemoteOK + Arbeitnow bundle | **Done** — C4 |
| 6.5 | BundesAPI / Arbeitsagentur | **Done** — C5 |
| 6.6 | Demote scrape discovery + memory fix | **Done** — C6 |
| 6.7 | Sources UI + API key settings | **Done** — C7 |

Discovery engine E1–E5 remains as **fallback** only ([discovery-engine-roadmap.md](./discovery-engine-roadmap.md)).

---

## Explicit non-goals

- Indeed/LinkedIn API scraping at scale
- Resume SEO or auto-apply bots
- Paid employer listings
- Industry lock-in — engine stays generic

**Last updated:** 2026-07-04
