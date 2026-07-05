# Discovery and matching

Pipeline specification for aperio-j. Implements the same staged pattern as Aperio: **fetch → parse → dedupe → classify → match → rank → explain**.

---

## Pipeline overview

```
Streams (RSS, list pages, capture URLs)
    → fetch raw items
    → parseOpportunity() — unified Opportunity record
    → dedupe by canonical URL + title hash
    → classify roleCategory, posterType, redFlags
    → store in index

SeekerProfile + SearchIntent
    → constraint filter (hard gates)
    → scoreOpportunity() — intent, capability, trust, geo
    → rank + explain
    → daily digest / inbox UI
```

---

## Stage 1 — Fetch (streams)

A **stream** is a poll target, identical in concept to Aperio's `InformationStream`:

| Field | Purpose |
|-------|---------|
| `label` | Human name |
| `kind` | `rss` \| `list_page` \| `capture` |
| `seedUrl` | Feed or page URL |
| `enabled` | Include in cron |
| `regionHint` | Optional city/region for geo boost |

**List pages:** `fetchListPage` extracts job-like links, then **`enrichListItemsWithDetails`** fetches up to 8 detail pages (configurable) to populate `body` for parse/match. Disable with `APERO_J_DETAIL_FETCH=false`.

---

## Stage 2 — Parse

Raw item → `Opportunity` (`@aperio-j/core`).

Parser responsibilities (`@aperio-j/discovery`):

| Output | Method |
|--------|--------|
| `roleCategories[]` | Rule patterns — production-line, qc, warehouse, sales, … |
| `posterType` | Agency keywords vs company direct-hire heuristics |
| `redFlags[]` | Deposit, training fee, scam patterns (CN + EN) |
| `employmentType` | full-time / part-time / unknown |
| `locationText` | Extract city/district from body |
| `requiredSignals[]` | Tokenized requirements from JD text |

---

## Stage 3 — Match

`scoreOpportunity(opportunity, profile)` returns `MatchResult`:

### Hard gates (score = 0, excluded)

| Gate | Condition |
|------|-----------|
| Location | Not in primary/acceptable cities and not remote-eligible |
| Avoid role | `roleCategories` intersects `intent.avoidRoles` |
| Avoid phrase | Body contains user `avoidPhrases` |
| Production line | `excludeProductionLine` && category is production-line |
| Sales | `excludeSales` && category is sales |
| Food service | `excludeFoodService` && category is food-service |
| Agency | `!allowAgencyPostings` && posterType is agency |
| Red flag | `hideRedFlagListings` && redFlags non-empty |

### Soft scores (0–100 each, weighted)

| Component | Weight | Source |
|-----------|--------|--------|
| `intentScore` | 0.35 | Expanded desired roles vs opportunity text |
| `capabilityScore` | 0.30 | skillTokens + inferred transferable vs requiredSignals |
| `trustScore` | 0.20 | Direct hire, no red flags, employer hint present |
| `geoScore` | 0.15 | City match; commute TBD when geocode lands |

```
finalScore = round(intent×0.35 + capability×0.30 + trust×0.20 + geo×0.15)
```

### Confidence

| finalScore | overlap terms | confidence |
|------------|---------------|------------|
| ≥ 72 | ≥ 3 | high |
| ≥ 55 | — | medium |
| else | — | low |

---

## Stage 4 — Explain

Every match includes:

- **Why surfaced** — intent hits, capability hits
- **Cautions** — red flags, agency, education mismatch
- **Geo note** — city/district match

Example:

> 匹配你的「质检」意向；手机组装与电子产线经验与 IQC 岗位重叠；深圳龙岗；公司直招。注意：要求高中以上学历。

---

## Search intents

Generated from onboarding (like Aperio discovery profiles):

```yaml
name: default
desiredRoles: [质检, 仓储, 物料]
avoidRoles: [流水线, 普工, 销售]
avoidPhrases: [劳务, 押金]
location: 深圳
employmentTypes: [full-time, part-time]
allowAgencyPostings: false
```

Intents drive **query expansion** at match time (synonym map in `@aperio-j/discovery`).

---

## Transferable capabilities

Rule-based inference from work history — no LLM:

| Past signal | Inferred capabilities |
|-------------|----------------------|
| 组装 / 流水线 | 精细操作, 电子组件, ESD, 物料识别 |
| 显示器 / 老化 | 外观检验, 功能测试, 质检流程 |
| 工厂环境 | 安全规范, 班组协作, 排班适应 |

These boost **adjacent** roles (QC, warehouse, material handler) when user selects `adjacent-industries` or `same-industry-non-production`.

---

## Feedback loop

| User action | Effect |
|-------------|--------|
| `not-interested` | Exclude same listing; down-rank similar `roleCategories` |
| `agency-scam` | Penalize source trust + lower stream `learningWeight` |
| `applied` | Up-rank similar `roleCategories` |
| `interested` | Small boost for similar categories (API; optional UI) |
| Edit questionnaire | Re-run match on stored index |

---

## Implementation map

| Spec stage | Package | Status |
|------------|---------|--------|
| Types | `@aperio-j/core` | Phase 0 |
| parseOpportunity | `@aperio-j/discovery` | Phase 0 |
| scoreOpportunity | `@aperio-j/matcher` | Phase 0 |
| Stream fetch | `@aperio-j/discovery` | Phase 1 — RSS + **list_page** |
| Source discovery | `@aperio-j/probe` + `@aperio-j/discovery` | Phase 2 |
| Stream health | `apps/web` stream-health | Phase 2d |
| Web onboarding UI | `apps/web` | Phase 1 |

**Last updated:** 2026-07-03
