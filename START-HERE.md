# aperio-j — start here

**Remote-first and gig-friendly job discovery:** aggregate international remote feeds, match to your profile and intent, rank with explainable scores. Ops, e-commerce, live stream, support, tech, and contract-friendly roles — no ads, no pay-to-rank.

On-site CN aggregators are **opt-in** (`on-site only` + city tag); cloud deploys use server IP, not the user's phone.

Forked conceptually from [Aperio](../aperio/docs/vision.md) (freelance/OSS clue engine), but profile intake and matching target **employment** (full-time, contract, part-time).

## Read order

| # | Doc | Purpose |
|---|-----|---------|
| 1 | [docs/vision.md](./docs/vision.md) | Product boundary vs Indeed / Aperio |
| 2 | [docs/onboarding-questionnaire.md](./docs/onboarding-questionnaire.md) | New-user questionnaire → `SeekerProfile` |
| 3 | [docs/discovery-and-matching.md](./docs/discovery-and-matching.md) | Fetch → parse → match pipeline |
| 4 | [docs/probe-packs.md](./docs/probe-packs.md) | Remote boards + city probe packs |
| 5 | [docs/roadmap.md](./docs/roadmap.md) | Phased delivery |
| 6 | [docs/desktop-mobile.md](./docs/desktop-mobile.md) | Tauri v2 desktop + mobile shells |
| 7 | [CHANGELOG.md](./CHANGELOG.md) | Release history |
| 8 | [docs/release.md](./docs/release.md) | Pre-release checklist |
| 9 | [docs/deployment.md](./docs/deployment.md) | Render / self-host web (share with friends) |

## Repo layout

```
packages/
  core/        Shared types (SeekerProfile, Opportunity, SourceProbe, …)
  probe/       ProbePack registry + expandSourceProbes (Layer 1)
  discovery/   Parse feeds, classify roles, source discovery, RSS fetch
  matcher/     Score opportunities against a seeker profile
  db/          Prisma / SQLite
apps/web/      Onboarding + inbox
```

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Current status

**Phases 0–2:** Engine + web shell + source discovery ✅  
**Phase 3 (partial):** Trust pack, location lite, inbox feedback ✅  
**Phase 4.1:** Capture URL ✅

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm db:push
pnpm dev    # http://localhost:3010
```

**Next (web-first):** commute radius (3.3), export/import (5.3), or live stream validation in your target city.
