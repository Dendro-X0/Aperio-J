# Deploying the web app

Share **apps/web** with friends (Android Chrome, any browser). **Desktop Tauri** remains the local-first install for your own daily use.

## Pick a path (5 minutes)

| Path | Cost | Friend in China | Data persists |
|------|------|-----------------|---------------|
| **[Render free + Turso free](#render-free-recommended-for-friends)** | $0 | Browser URL, no 备案 | Yes (Turso) |
| **[Cloudflare tunnel](#temporary-demo-from-your-pc)** | $0 | Hit or miss | Yes (your PC) |
| **[Self-host Docker](#self-hosted)** | Your hardware | LAN / your tunnel | Yes (SQLite file) |
| **Render Starter + disk** | ~$7/mo | Browser URL | Yes (SQLite file) |
| Vercel + Turso | $0 tier limits | Variable | Yes (Turso) |

**Product honesty:** The Android APK is a browser shell, not a standalone app. For a non-technical friend, send a **URL**, not an APK.

---

## Render free (recommended for friends)

You already know Render: free web tier, cold start after idle, no 备案 (overseas hosting).

### The one catch (important)

Render **free** instances have **ephemeral disk**. A SQLite file inside the container is **wiped** when the service sleeps or redeploys. So:

- **Render free + `file:` SQLite** → fine for a 10-minute demo, **not** for a friend’s saved profile.
- **Render free + [Turso](https://turso.tech) free** → $0, data survives sleep/redeploy. Still your instance, not a multi-tenant SaaS.

Turso is optional remote SQLite compatible with this repo (`libsql://` in `DATABASE_URL`).

### 1. Turso (once, ~3 min)

```bash
turso auth login
turso db create aperio-j
turso db show aperio-j --url          # copy libsql://…
turso db tokens create aperio-j       # copy token

pnpm turso:schema > schema.sql
turso db shell aperio-j < schema.sql
```

### 2. Render (once, ~5 min)

1. [render.com](https://render.com) → **New** → **Blueprint** → connect this GitHub repo  
   (or **New Web Service** → Docker, root = repo root, `render.yaml` is picked up automatically)
2. **Region:** Singapore (better for mainland China than US/EU)
3. **Environment variables:**

   | Key | Value |
   |-----|--------|
   | `DATABASE_URL` | `libsql://your-db-….turso.io` |
   | `TURSO_AUTH_TOKEN` | Turso token |
   | `CRON_SECRET` | auto-generated or your own |

4. Deploy → copy `https://aperio-j-xxxx.onrender.com`

### 3. Friend (zero setup)

Send the Render URL → **Chrome** on Android → optional **Add to Home screen**.

Cold start: first open after ~15 min idle may take **30–90 seconds** on free tier — normal for Render.

### Optional: wake before friend uses

Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/` every 14 minutes and reduce cold starts.

### Paid alternative on Render (file SQLite, no Turso)

Upgrade web service to **Starter**, attach a **persistent disk** at `/data`, set `DATABASE_URL=file:/data/aperio-j.db`, uncomment `disk:` in `render.yaml`.

---

## Temporary demo from your PC

For a quick test without Render:

```bash
pnpm dev
cloudflared tunnel --url http://127.0.0.1:3010
```

Share the `https://….trycloudflare.com` link. Your PC must stay on; China access is not guaranteed.

---

## Self-hosted

Run the Next.js standalone server with a **local SQLite file** on your machine or VPS.

### Docker

```bash
export CRON_SECRET="$(openssl rand -hex 32)"
docker compose up -d --build
```

Data: volume `aperio-j-data` at `/data/aperio-j.db`.

### Bare metal

```bash
pnpm db:push
pnpm build:selfhost
cd apps/web/.next/standalone
DATABASE_URL="file:/absolute/path/to/data/aperio-j.db" \
HOSTNAME=0.0.0.0 PORT=3010 node apps/web/server.js
```

Cron: `curl -X POST "http://127.0.0.1:3010/api/cron/refresh" -H "Authorization: Bearer $CRON_SECRET"` — see [cron.md](./cron.md).

---

## Android APK

Release APKs open **`APERIO_J_WEB_URL`** (your Render or self-host URL). The friend still needs **your** server running — same as Chrome. See [desktop-mobile.md](./desktop-mobile.md).

---

## Vercel + Turso (optional)

Serverless; see previous `vercel.json` setup. Render + Docker is simpler for this app (long requests, SQLite/Turso, no standalone cold-start on serverless limits).

---

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm build:selfhost` | Standalone bundle for Docker / VPS |
| `pnpm turso:schema` | SQL bootstrap for Turso or manual SQLite |
| `docker compose up -d --build` | Local / VPS Docker |
| `pnpm build:android` | APK shell (`APERIO_J_WEB_URL` required) |

---

## Related

- [desktop-mobile.md](./desktop-mobile.md) — desktop vs mobile
- [cron.md](./cron.md) — scheduled refresh
- [release.md](./release.md) — versioning

**Last updated:** 2026-07-10
