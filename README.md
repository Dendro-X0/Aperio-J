# aperio-j

A **general employment opportunity engine** — discover job signals from public feeds, match them algorithmically to each user's profile and intent, and explain why each opportunity surfaced.

Not a job board. Not Indeed. No ads. Ranking is algorithmic only.

## How it differs

| Indeed / job boards | aperio-j |
|---------------------|----------|
| Keyword search | Profile-shaped reverse matching |
| Employer-paid placement | No ads |
| Single listing source | Multi-source streams (RSS, forums, public boards) |
| Resume keyword match | Intent + capability + trust + geo scoring with explanations |

Conceptually extends [Aperio](https://github.com/Dendro-X0/Aperio)'s discovery pipeline, replacing GitHub portfolio with **evidence-based seeker profiles** (work history, skills, questionnaire).

**Scope:** Vertical-first employment engine — strongest for **Guangdong manufacturing/service hiring** and **remote RSS supplements**. Not a general Indeed replacement. See [docs/vision.md](./docs/vision.md).

## Quick start

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
pnpm db:push
pnpm dev          # http://localhost:3010
```

Engine-only tests:

```bash
pnpm test
pnpm fixture:run
```

See [START-HERE.md](./START-HERE.md) for documentation index.

## Packages

| Package | Role |
|---------|------|
| `@aperio-j/core` | Types: `SeekerProfile`, `Opportunity`, `MatchResult` |
| `@aperio-j/discovery` | Parse raw listings, classify roles, detect labor-agency red flags |
| `@aperio-j/matcher` | Score and rank opportunities against a profile |

## License

Private — helper tool for friends and future open release TBD.
