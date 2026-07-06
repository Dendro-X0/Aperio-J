# Release checklist

Use this before tagging `v0.2.0` (or any release).

## Local gates (match CI)

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
pnpm db:push
pnpm typecheck    # packages build + web tsc
pnpm test         # package unit tests
pnpm build:web    # Next.js production build
```

Optional desktop/mobile (slower):

```bash
pnpm build:desktop
pnpm build:android   # requires Android SDK + preflight
```

## Version bump

1. Update `version` in all `package.json` files and `apps/desktop/src-tauri/{tauri.conf.json,Cargo.toml}`.
2. Move `[Unreleased]` entries in `CHANGELOG.md` to a dated version section.
3. Commit: `chore: release v0.2.0`

## Publish

**Rolling installers (every push to main):** CI publishes to the `latest` GitHub prerelease automatically.

**Tagged release:**

```bash
git tag v0.2.0
git push origin v0.2.0
```

`.github/workflows/release.yml` builds Windows `.exe` + Android `.apk` and creates a GitHub Release with generated notes.

## Post-release

- Smoke-test: Profile → remote preset → Refresh matches → Sources → Enable all (API rows stay visible)
- Verify default locale is English on a fresh browser session
