# Scheduled refresh (Phase 2e)

Automated **fetch → match** and **weekly source re-discovery** without manual「刷新匹配」.

## What runs

For each profile with `onboardingComplete: true`:

| Step | When |
|------|------|
| **Source re-discovery** (Layer 1) | No enabled/healthy streams, any `dead` stream, or last discovery ≥ 7 days |
| **Match pipeline** (Layer 2–3) | Last match run ≥ 6 hours, or re-discovery just ran |

Profiles within the interval are skipped (`skipped: true`).

## Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `CRON_SECRET` | — | Required in production; Bearer token for `/api/cron/refresh` |
| `APERO_J_CRON_MATCH_INTERVAL_HOURS` | `6` | Min hours between match runs |
| `APERO_J_CRON_REDISCOVERY_DAYS` | `7` | Min days between full source re-discovery |

## Invoke

### CLI (local / systemd / crontab)

```bash
pnpm cron:refresh
pnpm cron:refresh -- --force-match
pnpm cron:refresh -- --force-rediscover --profile=<id>
```

### HTTP (Vercel Cron or curl)

```bash
curl -X POST "http://localhost:3010/api/cron/refresh" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Query params: `forceMatch=1`, `forceRediscover=1`, `profileId=<id>`.

### Vercel

`apps/web/vercel.json` schedules GET every 6 hours. Set `CRON_SECRET` in project env; Vercel sends it as `Authorization: Bearer …`.

## Response shape

```json
{
  "ranAt": "2026-07-03T…",
  "profilesChecked": 1,
  "profilesRefreshed": 1,
  "results": [
    {
      "profileId": "…",
      "primaryCity": "深圳",
      "skipped": false,
      "rediscovered": false,
      "matched": true,
      "streamCount": 3,
      "opportunityCount": 12,
      "matchedCount": 5,
      "errors": []
    }
  ]
}
```

## Dev without secret

If `CRON_SECRET` is unset and `NODE_ENV !== production`, the endpoint accepts unauthenticated requests (local testing only).
