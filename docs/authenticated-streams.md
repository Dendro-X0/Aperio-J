# Authenticated streams (session auth)

Some employers publish job lists behind a login wall — internal HR portals, alumni boards, member-only listings. aperio-j can fetch those **only when you opt in** and supply credentials yourself.

This is an **advanced, technical-user** path. It is not account linking in the OAuth sense.

---

## What we support today

| Auth mode | When to use |
|-----------|-------------|
| **None** (default) | Public RSS, government boards, open career pages |
| **Cookie** | Paste the `Cookie` header from your browser devtools after you log in normally |
| **Bearer** | Paste an API or session token if the site exposes one |

Credentials are stored in your **local SQLite** database (`authSecret` on custom stream rows). They never leave your machine unless you copy the database file.

Session auth applies only to **custom sources** you add under Sources → Add custom URL. Auto-discovered probe-pack streams cannot use it.

---

## Blocked hosts (ban-risk)

We **reject** session auth for high-risk aggregators and social networks where automated access routinely triggers account bans:

- LinkedIn
- Indeed
- Glassdoor
- Facebook / Meta
- Instagram

If you were banned on LinkedIn for scraping-like activity, that is exactly why we block it — we will not build a “connect LinkedIn” flow that logs in and crawls on your behalf.

**Safer alternatives for walled aggregators:**

1. **Paste a job link** on the inbox — one-off capture without storing site-wide credentials.
2. Use **public RSS or employer career pages** when the listing is also published openly.
3. Apply on the aggregator manually; use aperio-j for sources that publish openly or that you control (your employer portal, local gov HR).

---

## How to add session auth

1. Open **Sources** → **Add custom URL**.
2. Enter the list or RSS URL you can open while logged in.
3. Expand **Session auth (advanced)**.
4. Choose Cookie or Bearer and paste the value from browser devtools (Network tab → request headers).
5. Validate and enable the source; run **Refresh matches**.

To **refresh expired cookies**, open the row menu → **Edit session auth** (paste a new credential; leave blank to keep the current one) or **Test connection** to re-check without changing credentials. Failed tests mark the source **stale** until credentials work again.

Custom streams with auth show a **Session** badge. Use the row menu → **Clear session auth** to remove credentials without deleting the source.

---

## Security notes

- Treat `authSecret` like a password — anyone with your SQLite file can read it.
- Cookies expire; you may need to refresh them when fetches start failing.
- Respect site terms of service; session auth is for portals **you are authorized to access**, not for bypassing paywalls you do not pay for.

---

## Future: simpler connection (not implemented)

A friendlier path would be a **browser extension** that copies session cookies only for domains you explicitly allow, or **OAuth** where a platform officially permits API access. Neither replaces the need for caution on ban-prone sites — LinkedIn-style login scraping remains out of scope.
