# aperio-j

A **profile-driven remote and gig work discovery engine**. It aggregates international remote feeds and API connectors, matches listings to your skills and intent, and explains every score — no ads, no pay-to-rank.

**Primary focus:** remote jobs, flexible ops/gig roles (e-commerce, live stream, customer support, content), and freelance-friendly contract work — not on-site factory hiring in China.

Optional **city tags** add local sources only when you choose **on-site only**. Hybrid and remote profiles scan international remote boards first (Work Best–style).

## How it differs

| Indeed / job boards | aperio-j |
|---------------------|----------|
| Keyword search | Profile-shaped reverse matching |
| Employer-paid placement | No ads |
| Single listing source | Multi-source streams (RSS, APIs, custom URLs) |
| Resume keyword match | Intent + capability + trust + geo scoring with explanations |

Conceptually extends [Aperio](https://github.com/Dendro-X0/Aperio)'s discovery pipeline, replacing GitHub portfolio with **evidence-based seeker profiles** (work history, skills, questionnaire).

**Best fit:** Remote ops, gig-friendly, and tech roles from We Work Remotely, Remote OK, Remotive, Himalayas, and similar feeds.

**Not a fit:** Replacing BOSS/智联 for non-technical users in China; scraping login-walled CN apps from overseas servers.

See [docs/vision.md](./docs/vision.md).

## Quick start

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
pnpm db:push
pnpm dev          # http://localhost:3010
```

1. Open **Profile settings** → use **Remote ops & gig** or **E-commerce & live stream** quick template (or fill industry + roles manually).
2. Leave cities empty for pure remote, or add a city only if you want on-site local sources.
3. Open **Matches** → **Refresh matches**.
4. Paste job links on the inbox to capture listings that feeds miss.

Engine-only tests:

```bash
pnpm test
pnpm fixture:run
```

See [START-HERE.md](./START-HERE.md) for documentation index.

## Local search and connectors

- City tags resolve against a metro catalog (~164 cities) with alias normalization and autocomplete.
- City-scoped connectors run once per city tag; geo-scoped connectors dedupe by country/region.
- **On-site only** + China city → local aggregator streams (experimental; works best from a China IP).
- **Remote / hybrid** → international remote boards; no automatic BOSS/拉勾 scrape from cloud deploys.

## Packages

| Package | Role |
|---------|------|
| `@aperio-j/core` | Types: `SeekerProfile`, `Opportunity`, `MatchResult` |
| `@aperio-j/discovery` | Parse feeds, API connectors, classify roles |
| `@aperio-j/matcher` | Score and rank opportunities against a profile |
| `@aperio-j/probe` | Probe packs + remote board registry |

## License

Private — open release TBD. See [CHANGELOG.md](./CHANGELOG.md) for release history.

## Locales

- **English** (`en`) — default UI and engine locale
- **简体中文** (`zh-CN`) — full UI + engine
- **Español** (`es`) — UI template (primary surfaces translated; advanced settings fall back to English)
