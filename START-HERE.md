# aperio-j — start here

General-purpose **employment opportunity engine**: discover signals from public feeds, match them to a seeker's profile and intent, rank with explainable scores. No ads, no pay-to-rank.

Forked conceptually from [Aperio](../aperio/docs/vision.md) (freelance/OSS clue engine), but profile intake and matching target **full-time / part-time employment** across industries.

## Read order

| # | Doc | Purpose |
|---|-----|---------|
| 1 | [docs/vision.md](./docs/vision.md) | Product boundary vs Indeed / Aperio |
| 2 | [docs/onboarding-questionnaire.md](./docs/onboarding-questionnaire.md) | New-user questionnaire → `SeekerProfile` |
| 3 | [docs/discovery-and-matching.md](./docs/discovery-and-matching.md) | Fetch → parse → match pipeline |
| 4 | [docs/source-discovery-design.md](./docs/source-discovery-design.md) | **Auto source discovery** (Phase 2 proposal) |
| 5 | [docs/roadmap.md](./docs/roadmap.md) | Phased delivery |
| 6 | [docs/desktop-mobile.md](./docs/desktop-mobile.md) | Tauri v2 desktop + mobile shells, self-signing |

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
