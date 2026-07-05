# Taxonomy (matchable categories)

Industries, sub-sectors, and cities are **structured matchable objects** — not opaque strings. Definitions live in JSON so communities can extend catalogs without forking matcher logic.

## Catalog

```
packages/core/taxonomies/nodes.json
```

Each node:

| Field | Purpose |
|-------|---------|
| `id` | Stable ref, e.g. `city:shenzhen`, `subSector:qc` |
| `kind` | `city` \| `industry` \| `subSector` |
| `parentId` | Sub-sector → industry; optional hierarchy |
| `roleCategory` | Bridge to legacy `RoleCategory` enum |
| `labels` | Localized display names (`zh-CN`, `en`) |
| `matchTerms` | Terms matched in profile text / job postings |

Published path: `@aperio-j/core/taxonomies/nodes.json`

## Runtime refs

At parse/match time nodes resolve to `TaxonomyRef`:

```typescript
{ id: "subSector:qc", kind: "subSector", label: "质检", parentId: "industry:electronics-manufacturing" }
```

- **Opportunities** — `taxonomyRefs` on `Opportunity` (from text + role categories)
- **Seekers** — `buildSeekerTaxonomy(profile)` from city constraints, intent, artifacts, skills
- **Match results** — `taxonomyHits` on `MatchResult` when seeker and opportunity refs overlap

## Scoring

Taxonomy overlap blends into `intentScore` (30% weight when hits exist). Parent industry matches count when the opportunity sub-sector belongs to a seeker industry. Explanations include `matcher.explanation.taxonomyMatch` from locale packs.

## Extending

1. Add nodes to `nodes.json` (keep ids stable).
2. Optionally link `roleCategory` for rule-based classification bridge.
3. Rebuild `@aperio-j/core` — catalog copies to `dist/taxonomies/`.

Detection regex for role categories remains in `@aperio-j/discovery`; taxonomy adds a **display + match layer** on top.
