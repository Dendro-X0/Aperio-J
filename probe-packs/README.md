# Community signal packs

City × role **signal source packs** extend built-in probe packs with extra RSS/list URLs tuned for specific labor markets (e.g. 深圳 × 普工).

## Layout

```
probe-packs/
  README.md
  *.json          — one pack per file
```

Built-in packs ship in `packages/probe/src/signal-packs/builtin-packs.ts`. Files here **merge** with built-ins at runtime.

## Enable

Drop JSON files in this folder, or set:

```bash
APERO_J_SIGNAL_PACKS_DIR=/path/to/your/packs
```

Restart the web app / match run. Packs are loaded once per process (cache resets on restart).

## JSON schema

```json
{
  "id": "zh-CN-shenzhen-electronics",
  "locale": "zh-CN",
  "citySlugs": ["shenzhen"],
  "cityLabels": ["深圳", "深圳市"],
  "roleKeywords": ["普工", "SMT", "贴片"],
  "streams": [
    {
      "id": "my-feed",
      "label": "示例 RSS",
      "seedUrl": "https://example.com/jobs.rss",
      "kind": "rss",
      "domainTier": "aggregator"
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Unique pack id |
| `locale` | yes | e.g. `zh-CN` |
| `citySlugs` | yes | Match `resolveCitySlug` values |
| `cityLabels` | no | Chinese/English city labels |
| `roleKeywords` | yes | Substring match on desired roles, industries, artifacts |
| `streams` | yes | Same shape as probe pack registry streams |

`domainTier`: `gov` \| `edu` \| `company` \| `aggregator` \| `unknown`

## Matching

A pack applies when:

1. Profile primary city is in China and matches `citySlugs` / `cityLabels`
2. Any `roleKeywords` appears in desired roles, industries, or work history text

Matched streams are registered as `signal-pack:{packId}:{streamId}` and participate in discovery + match fetch.

## Trust

Aggregator boards may include agencies. Profile trust settings still filter at match time — packs only add poll targets.
