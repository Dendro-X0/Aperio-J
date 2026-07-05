# Profile settings

**Principle:** minimal input, engine does the rest. No third-party import in this version.

## What the user fills in

| Field | Maps to |
|-------|---------|
| 城市标签（可多选） | `constraints.primaryCity` + `acceptableCities[]` |
| 行业 / 职业 | `intent.desiredIndustries[]`, `artifacts[].industry`, `artifacts[].title` — **required for discovery** |
| 工作形态 | `constraints.employmentTypes` |
| 背景与技能 (free text) | `artifacts[]`, `skillTokens`, `inferredCapabilities` |
| 想找的方向 | `intent.desiredRoles` (empty → `["不限"]`) |
| 不要的机会 | `intent.avoidRoles`, `intent.avoidPhrases` |
| 排除产线 / 销售 | `intent.excludeProductionLine`, `intent.excludeSales` |

Users may **skip initial setup** and configure later; match/source discovery stays disabled until industry and occupation are set.

## Defaults (not shown in UI)

- `allowAgencyPostings: false`
- `hideRedFlagListings: true`
- `preferDirectHire: true`
- `industryProximity: open-to-any`
- `educationLevel: high-school` (until we add an optional field)

## Save pipeline

On **保存并运行匹配**:

1. Persist `SeekerProfile` to SQLite
2. `discoverAndPersistStreams(profile)` — Layer 1
3. `runMatchPipeline(profile)` — fetch → parse → rank
4. Redirect to `/inbox`

## Out of scope (v1)

- GitHub / LinkedIn / resume file import
- Multi-step wizard or display name
- Per-field education / salary / certificates (can add later as optional advanced block)

## Future (OSS)

Phase 4 may add optional **third-party profile sync** (GitHub portfolio, structured resume) as a separate adapter — not a replacement for intent/avoid, which stay user-controlled.
