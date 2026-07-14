# Release checklist

Use this before tagging a new version (for example `v0.3.0`).

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
3. Refresh release-facing docs:
   - `README.md` capability highlights
   - `docs/discovery-and-matching.md` if pipeline behavior changed
   - `apps/web/.env.example` for new runtime flags/secrets
4. Commit: `chore: release vX.Y.Z`

## Web deploy (browser + Android)

See [deployment.md](./deployment.md) for self-hosted web setup (Docker or standalone) before sharing a URL.

**Android APK in releases:** set GitHub secret `APERIO_J_WEB_URL` **or** commit your public URL (one line, no `#`) to `apps/desktop/release-web-url.txt`, then tag and push. Without a URL, CI skips the APK; desktop builds still ship (Windows, Linux AppImage, macOS dmg).

## Publish

**Rolling installers (every push to main):** CI publishes to the `latest` GitHub prerelease automatically.

**Tagged release:**

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

`.github/workflows/release.yml` builds Windows `.exe`, Linux AppImage, macOS `.dmg` (Apple Silicon + Intel), and Android `.apk` when configured, then creates a GitHub Release with generated notes.

## Post-release

- Smoke-test: Profile → remote preset → Refresh matches → Sources → Enable all (API rows stay visible)
- Smoke-test: Profile with multiple cities → verify inbox city filter and Sources technical details
- Verify default locale is English on a fresh browser session
