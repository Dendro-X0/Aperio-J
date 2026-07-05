# Onboarding questionnaire

New users complete a structured questionnaire before the engine runs discovery. Answers map directly to `SeekerProfile` fields in `@aperio-j/core`.

Design goals:

- **Do not guess** what the user wants — they declare it
- **Support career pivots** — past factory work does not force future factory matches
- **Capture trust preferences** — especially labor-agency avoidance
- **10–15 minutes** on first run; editable later

---

## Section A — Location & work arrangement

| # | Question | Field | Type | Required |
|---|----------|-------|------|----------|
| A1 | Which city are you looking for work in? | `constraints.primaryCity` | string | yes |
| A2 | Other acceptable cities (comma-separated) | `constraints.acceptableCities[]` | string[] | no |
| A3 | Open to remote/hybrid? | `constraints.remotePreference` | `remote-only` \| `hybrid-ok` \| `onsite-only` | yes |
| A4 | Maximum commute time (minutes) | `constraints.maxCommuteMinutes` | number | no |
| A5 | Employment type | `constraints.employmentTypes[]` | `full-time` \| `part-time` \| `contract` | yes |

**Example (friend scenario):** primaryCity = `深圳`, remotePreference = `onsite-only`, employmentTypes = `[full-time, part-time]`.

---

## Section B — Work history (evidence artifacts)

Repeatable block — at least one entry.

| # | Question | Field | Type | Required |
|---|----------|-------|------|----------|
| B1 | Job title / role | `artifacts[].title` | string | yes |
| B2 | Industry | `artifacts[].industry` | string | yes |
| B3 | Company type (optional) | `artifacts[].employerType` | string | no |
| B4 | Main duties (free text) | `artifacts[].duties` | string | yes |
| B5 | Equipment / tools used | `artifacts[].tools[]` | string[] | no |
| B6 | Start – end (or "present") | `artifacts[].period` | string | yes |

**Example entries:**

1. 手机组装操作员 — 电子代工 — 流水线组装、外观检查、ESD 防护
2. 显示器生产 — 电子制造 — 老化测试、包装

These feed **skill token extraction** and **transferable capability inference** (see matcher).

---

## Section C — Skills & credentials

| # | Question | Field | Type | Required |
|---|----------|-------|------|----------|
| C1 | Skills you have (tags) | `skillTokens[]` | string[] | yes |
| C2 | Certificates / licenses | `certificates[]` | string[] | no |
| C3 | Years of work experience (total) | `experienceYears` | number | yes |
| C4 | Highest education | `educationLevel` | enum | yes |
| C5 | Languages | `languages[]` | string[] | no |

Education enum: `below-high-school` | `high-school` | `vocational` | `associate` | `bachelor` | `above-bachelor`

---

## Section D — What you want (intent)

| # | Question | Field | Type | Required |
|---|----------|-------|------|----------|
| D1 | Roles you'd like to explore (multi-select + other) | `intent.desiredRoles[]` | string[] | yes |
| D2 | Industries you'd consider | `intent.desiredIndustries[]` | string[] | no |
| D3 | How far from current industry? | `intent.industryProximity` | see below | yes |
| D4 | Minimum monthly salary (CNY, optional) | `constraints.minMonthlySalaryCny` | number | no |

**D3 — industryProximity:**

| Value | Matching behavior |
|-------|-------------------|
| `same-industry-non-production` | Keep electronics/manufacturing; penalize production-line categories |
| `adjacent-industries` | Boost transferable capabilities (QC, warehouse, logistics) |
| `open-to-any` | Intent and capability only; lighter industry penalty |

**Suggested D1 options (localized in UI):**

- 质检 / QC / 品检
- 仓储 / 物流
- 物料 / 仓管
- 设备维护 / 机修辅助
- 生产文职 / 跟单 / 资料员
- 行政 / 后勤
- 其他（自填）

---

## Section E — What you refuse (avoid)

| # | Question | Field | Type | Required |
|---|----------|-------|------|----------|
| E1 | Roles to exclude (multi-select) | `intent.avoidRoles[]` | string[] | yes |
| E2 | Free-text avoid phrases | `intent.avoidPhrases[]` | string[] | no |
| E3 | Exclude all production-line / factory floor work? | `intent.excludeProductionLine` | boolean | yes |
| E4 | Exclude sales / customer-facing sales? | `intent.excludeSales` | boolean | yes |
| E5 | Exclude food service / hospitality? | `intent.excludeFoodService` | boolean | no |

**Default suggestions for E1:** 流水线, 普工, 销售, 服务员, 电话营销, 夜班

---

## Section F — Trust & poster preferences

| # | Question | Field | Type | Default |
|---|----------|-------|------|---------|
| F1 | Show labor-agency postings? | `constraints.allowAgencyPostings` | boolean | `false` |
| F2 | Hide listings with red flags (deposit, training fee, …)? | `constraints.hideRedFlagListings` | boolean | `true` |
| F3 | Require direct employer hint when possible? | `constraints.preferDirectHire` | boolean | `true` |

---

## Mapping to SeekerProfile

```typescript
// Questionnaire submit → SeekerProfile (simplified)
{
  constraints: { /* A + F + D4 + E */ },
  intent: { /* D + E */ },
  artifacts: [ /* B */ ],
  skillTokens: [ /* C1 + inferred from B */ ],
  certificates: [ /* C2 */ ],
  experienceYears: C3,
  educationLevel: C4,
  languages: C5,
  inferredCapabilities: /* computed by matcher from artifacts */,
  seekerDigest: /* optional one-line summary */
}
```

---

## Post-onboarding

1. Generate default **search intents** from D + E
2. Suggest **stream pack** for primary city (e.g. Shenzhen public feeds — configured in settings)
3. Run first **discovery + match** pass
4. Show top matches with explanations; collect feedback (`not-interested`, `applied`, `agency-scam`)

**Last updated:** 2026-07-03
