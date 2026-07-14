# aperio-j

**English** · [简体中文](./README.zh-CN.md)

A **profile-driven remote and gig work discovery engine**. It aggregates international remote feeds and API connectors, matches listings to your skills and intent, and explains every score — no ads, no pay-to-rank.

**Primary focus:** remote jobs, flexible ops/gig roles (e-commerce, live stream, customer support, content), and freelance-friendly contract work — not on-site factory hiring in China.

Optional **city tags** add local sources only when you choose **on-site only**. Hybrid and remote profiles scan international remote boards first (Work Best–style).

## Downloads

Pre-built installers are on [GitHub Releases](https://github.com/Dendro-X0/Aperio-J/releases).

| Platform | File | Notes |
|----------|------|-------|
| Windows | `Aperio-J-windows-setup.exe` | Local SQLite — works offline |
| Android | `Aperio-J-android.apk` | Thin shell that opens your hosted web URL |
| Browser | any modern browser | Best for friends in China — no APK sideload |

**Android APK:** the app opens your self-hosted instance (`APERIO_J_WEB_URL`). For CI/releases, set GitHub secret `APERIO_J_WEB_URL` or commit your public URL to [`apps/desktop/release-web-url.txt`](./apps/desktop/release-web-url.txt). Friends can also open your Render URL in Chrome and **Add to Home screen**.

See [docs/deployment.md](./docs/deployment.md) and [docs/desktop-mobile.md](./docs/desktop-mobile.md).

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
2. Set **Network environment** (Auto / Mainland China / Overseas) if you are behind the Great Firewall.
3. Leave cities empty for pure remote, or add a city only if you want on-site local sources.
4. Open **Matches** → **Refresh matches**.
5. Paste job links on the inbox to capture listings that feeds miss.

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
- **Mainland China:** CN-friendly sources (电鸭, 猪八戒) are prioritized; optional `APERO_J_RSS_RELAY_URL` for international RSS via Singapore relay.

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
