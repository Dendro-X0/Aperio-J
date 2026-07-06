# Probe packs

Locale-keyed **signal source seeds** — the engine validates these at runtime; dead URLs are skipped.

## Layout

```
packages/probe/src/probe-packs.ts        — built-in city probe packs (code)
packages/probe/src/signal-packs/        — built-in city × role packs (code)
probe-packs/                              — community JSON signal packs (optional)
```

## Signal packs (city × role)

Beyond city probe packs, **signal packs** add sources when both city and occupation match — e.g. 深圳 + 普工 → 58同城·深圳, 深圳人才网.

| Pack ID | City | Role keywords (sample) |
|---------|------|-------------------------|
| `zh-CN-shenzhen-factory` | 深圳 | 普工, 产线, 质检, 工厂, 电子厂 |
| `zh-CN-shenzhen-warehouse` | 深圳 | 仓储, 仓管, 物料 |
| `zh-CN-dongguan-factory` | 东莞 | 普工, 工厂, 制造 |
| `zh-CN-guangzhou-factory` | 广州 | 普工, 工厂, 制造 |
| `zh-CN-huizhou-factory` | 惠州 | 普工, 电子厂 |

Community contributions: drop JSON in [`probe-packs/`](../probe-packs/) or set `APERO_J_SIGNAL_PACKS_DIR`. See [probe-packs/README.md](../probe-packs/README.md).

## Built-in packs

| Pack ID | Cities | Sources |
|---------|--------|---------|
| `zh-CN-GD-SZ` | 深圳 | 智联/BOSS·深圳, 51job, 拉勾, 深圳人才网, 深圳人社门户 |
| `zh-CN-GD-DG` | 东莞 | 智联/BOSS·东莞, 51job, 拉勾, 东莞人社 |
| `zh-CN-GD-GZ` | 广州 | 智联/BOSS·广州, 51job, 拉勾, 广州人社 |
| `zh-CN-generic` | other CN cities | 51job, 拉勾 + city-slug aggregators when slug known |
| `global-city` | Paris, SF, London, Frankfurt, … | National/city job portals + Indeed/LinkedIn + search probes |
| `global-remote` | no city / remote-only | Remote RSS boards (We Work Remotely, Remote OK, Remotive, Working Nomads, HN Hiring, …) |

**CN remote-first:** When `primaryCity` is China and `remotePreference` is `hybrid-ok` or `remote-only`, discovery uses pack `zh-CN-remote-dev` — the same remote RSS list as `global-remote`, not BOSS/智联 autodiscover. Onsite-only CN profiles keep city packs (gov + local aggregators).

## Search spheres (discovery queries)

City tags select a **search sphere** — which search engines and query templates run during source discovery:

| Sphere | Cities | Engines | Query examples |
|--------|--------|---------|----------------|
| `cn` | 深圳, 杭州, any CJK city or known CN slug | Baidu, Bing | `{city} 人社局 招聘` |
| `global` | Bonn, Paris, London, NYC, Mexico City, Lagos, … | Google, Bing | `{city} jobs board`, `{city} government employment careers` |
| `none` | (empty) | — | Skipped; RSS/registry probes only |

The `global` sphere is intentionally broad: Europe, Americas, Africa, South Asia, and Oceania all use Google + Bing unless the city is in the Chinese ecosystem.

Configure via environment:

- `APERO_J_SEARCH_PROBE=false` — disable search discovery entirely
- `APERO_J_SEARCH_PROBE_QUERIES=2` — queries per engine (default 2)
- `APERO_J_SEARCH_PROBE_MAX=4` — max search probes per discovery run (default 4)
- `APERO_J_SIGNAL_PACKS_DIR` — optional directory of community city×role JSON packs

Future: `eastern-europe` sphere (Yandex) can extend `SEARCH_SPHERE_ENGINES` without changing the Profile UI.

## City slug fallback

`resolveCitySlug("杭州")` → `hangzhou` → probes `hangzhou.zhaopin.com`, `zhipin.com/hangzhou`.

Extend `CITY_SLUG_ALIASES` in `probe-packs.ts` or contribute a JSON pack.

## Adding a stream

```typescript
{
  id: "my-city-zhaopin",
  label: "智联招聘·XX",
  seedUrl: "https://slug.zhaopin.com/",
  kind: "list_page",
  domainTier: "aggregator",
}
```

`kind: "list_page"` for HTML portals; `"rss"` only when feed URL is stable.

Validation requires confidence ≥ 0.35 (domain tier + sample items + geo/intent sniff).

## Search discovery (Layer 1)

For any Profile city, the engine runs **bounded search probes** routed by sphere (see table above). Result HTML is parsed for government job portals and board URLs, ranked per sphere, validated, and merged into the user's StreamRegistry.

Disable: `APERO_J_SEARCH_PROBE=false`. Limit queries: `APERO_J_SEARCH_PROBE_QUERIES=2`. Cap probes: `APERO_J_SEARCH_PROBE_MAX=4`.

## Trust note

Aggregator boards may include agency listings. Profile trust defaults (`hideRedFlagListings`, `allowAgencyPostings: false`) filter at match time — probe pack only discovers poll targets.
