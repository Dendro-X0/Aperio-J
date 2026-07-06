# Discovery reset on location change

When a user **changes city tags** in Profile settings and saves, the engine clears stale regional data so old listings cannot leak into the new location.

## What gets cleared

| Artifact | Action |
|----------|--------|
| Auto-discovered streams | Removed from StreamRegistry |
| User custom URLs | **Kept** |
| Match runs | Deleted for this profile |
| Opportunity records | Deleted when `sourceId` matches removed auto streams |

## User flow

1. Profile → Location → edit city tags → **Save**
2. Dialog: **Location changed — re-discover sources**
3. User runs discovery (`/inbox?discover=1` or Sources → Re-discover)
4. User **Refresh matches** on inbox

If step 3 is skipped, inbox shows a banner: **No job sources for this location**.

## Implementation

- `profile-location.ts` — compares normalized city lists
- `discovery-reset.ts` — `resetDiscoveryForLocationChange(profileId)`
- `POST /api/profile` — calls reset when `locationChanged`
- `runMatchPipeline` — only merges stored opportunities from **current enabled stream IDs**

## Match deduplication

After fetch, `dedupeOpportunities()` collapses listings that share:

- the same normalized URL (UTM params stripped), or
- the same title (≥ 12 chars) from different feeds

The richest body wins.

## Stream fetch concurrency

RSS/list pages fetch in parallel batches (default **4** concurrent streams). Override:

```bash
APERO_J_STREAM_FETCH_CONCURRENCY=6
```

## Fetch cache, host cooldown, and search tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `APERO_J_STREAM_FETCH_CACHE_TTL_MS` | dev 1h / prod 15m | SQLite cache TTL for per-stream feed items |
| `APERO_J_FETCH_HOST_INTERVAL_MS` | 3000 | Minimum gap between requests to the same host |
| `APERO_J_FETCH_HOST_COOLDOWN_MS` | 120000 | Cooldown after WAF/429 before retrying a host |
| `APERO_J_CN_PLAYWRIGHT` | `true` | Set `false` to skip Playwright for CN aggregators |
| `APERO_J_SEARCH_PROBE` | `true` | Set `false` to disable search-engine discovery |
| `APERO_J_SEARXNG_URL` | unset | Self-hosted SearXNG base URL (prepended to CN/global search probes) |
| `APERO_J_CN_XHR_JSON` | `true` | Set `false` to disable Playwright XHR JSON intercept on BOSS/智联 |
| `APERO_J_FIRECRAWL_API_KEY` | unset | Optional Firecrawl scrape fallback for blocked CN aggregators |
| `APERO_J_SEARCH_PROBE_QUERIES` | 2 | Max search queries per engine per run |
| `APERO_J_SEARCH_PROBE_MAX` | 8 | Max search probe URLs per discovery run |

Clear cached feed items without changing location: **Sources → Clear fetch cache**, or `POST /api/settings/cache`.

**Last updated:** 2026-07-05
