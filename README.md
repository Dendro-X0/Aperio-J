# aperio-j

A **profile-driven remote job discovery engine** for tech professionals, freelancers, and digital nomads. It aggregates public remote feeds and API connectors, matches listings to your skills and intent, and explains every score — no ads, no pay-to-rank.

Optional **city tags** add hybrid local sources (API connectors, country boards, city boards, CN aggregators) when you want both remote and on-site options.

## How it differs

| Indeed / job boards | aperio-j |
|---------------------|----------|
| Keyword search | Profile-shaped reverse matching |
| Employer-paid placement | No ads |
| Single listing source | Multi-source streams (RSS, APIs, custom URLs) |
| Resume keyword match | Intent + capability + trust + geo scoring with explanations |

Conceptually extends [Aperio](https://github.com/Dendro-X0/Aperio)'s discovery pipeline, replacing GitHub portfolio with **evidence-based seeker profiles** (work history, skills, questionnaire).

**Best fit:** Remote and tech roles from We Work Remotely, Remote OK, Remotive, Himalayas, HN Hiring, and similar feeds. **Also supports:** City-scoped discovery when you add location tags.

See [docs/vision.md](./docs/vision.md).

## Quick start

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
pnpm db:push
pnpm dev          # http://localhost:3010
```

1. Open **Profile settings** → use **Remote software engineer** or **Digital nomad** quick template (or fill industry + roles manually).
2. Leave cities empty for pure remote, or add a city for hybrid local + remote sources.
3. Open **Matches** → **Refresh matches**.
4. Open **Sources** → expand **Technical details** to inspect resolved city/metropolitan mapping and connector query routing.

Engine-only tests:

```bash
pnpm test
pnpm fixture:run
```

See [START-HERE.md](./START-HERE.md) for documentation index.

## Local search and connectors

- City tags resolve against a metro catalog (~164 cities) with alias normalization and autocomplete.
- City-scoped connectors run once per city tag; geo-scoped connectors dedupe by country/region.
- Profile settings show a **Discovery region** summary so users can verify how local routing resolves.
- Sources page shows **Technical details** for city identity and connector URL/query diagnostics.
- Experimental city-aware connectors (Careerjet, Jooble) can be enabled with `APERO_J_CONNECTORS_EXPERIMENTAL=true`.

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
