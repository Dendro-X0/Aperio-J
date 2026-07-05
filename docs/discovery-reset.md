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

**Last updated:** 2026-07-04
