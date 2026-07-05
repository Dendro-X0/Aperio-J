# Desktop & mobile shells (Tauri v2)

Single Tauri project at **`apps/desktop`** wraps the same **`apps/web`** Next.js UI for:

| Target | Command | Engine backend |
|--------|---------|----------------|
| Desktop (Win/macOS/Linux) | `pnpm dev:desktop` / `pnpm build:desktop` | Bundled Next standalone + Node sidecar + SQLite in app data dir |
| Android | `pnpm dev:android` / `pnpm build:android` | Dev: Next dev server · Release: shell only (see below) |
| iOS | `pnpm dev:ios` / `pnpm build:ios` | Dev: Next dev server · Release: shell only (macOS + Xcode required) |

Architecture matches [platform-vision.md](./platform-vision.md) Phase 5.

## Prerequisites

### All platforms

- Node 20+, pnpm, Rust stable (`rustup`)
- `pnpm install` at repo root

### Desktop

- **Windows:** WebView2 (usually preinstalled)
- **Linux:** `webkit2gtk` dev packages
- **macOS:** Xcode CLI tools

### Android

- Android Studio / SDK + NDK (Tauri picks installed NDK)
- `JAVA_HOME` set
- Rust Android targets: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
- One-time: `pnpm --filter @aperio-j/desktop android:init` (already run in-repo)

### iOS

- macOS with Xcode 15+
- One-time: `pnpm --filter @aperio-j/desktop ios:init`
- `APPLE_DEVELOPMENT_TEAM` for device builds (free Apple ID works)

## Development

### Desktop

```bash
pnpm dev:desktop
```

Opens a Tauri window pointed at `http://127.0.0.1:3010` (Next dev server started automatically).

### Mobile (dev)

Mobile builds **do not** bundle the Node sidecar. During development the webview loads the same Next dev server as desktop.

```bash
pnpm dev:android   # emulator or USB device
pnpm dev:ios       # simulator or device (macOS)
```

**Android emulator:** Tauri rewrites the dev host; if the webview cannot reach the API, ensure the Next server binds `0.0.0.0` and use your LAN IP in `tauri.conf.json` > `build.devUrl` via `--config` override.

**Physical device:** Point `devUrl` at `http://<your-lan-ip>:3010`.

## Production builds

### Desktop

```bash
pnpm build:desktop
```

Runs `prepare:server` (Next standalone + Prisma engines + Node sidecar), then `tauri build`. SQLite lives under the OS app data directory.

Artifacts: `apps/desktop/src-tauri/target/release/bundle/`

### Android

```bash
pnpm build:android
```

Release APK/AAB is signed when `src-tauri/gen/android/keystore.properties` exists (see self-signing below). CI uses the committed upload keystore at `apps/desktop/signing/android-upload.jks` and publishes **signed release APKs** to [GitHub Releases](https://github.com/Dendro-X0/Aperio-J/releases/latest) on every `main` push.

### iOS

```bash
pnpm build:ios
```

Requires macOS. Ad-hoc / development signing uses `APPLE_DEVELOPMENT_TEAM`.

### Mobile release limitation (current)

The employment engine still runs in the **Next.js + Prisma** server. That stack is bundled for **desktop only** via the Node sidecar. Mobile **release** builds ship the Tauri shell without an embedded engine — use **dev mode** against a local/self-hosted web instance, or wait for a future Rust-native engine port (roadmap 5.5+).

## OSS-friendly self-signing

No paid certificates are required for local distribution or GitHub Releases.

**CI (automatic):** Every push to `main` builds installers and publishes them to the rolling [`latest` release](https://github.com/Dendro-X0/Aperio-J/releases/latest) — `Aperio-J-windows-setup.exe` and `Aperio-J-android.apk` (signed release APK for sideload).

Copy `apps/desktop/.env.signing.example` → `.env.signing` (gitignored) and export variables before local release builds.

### Windows

```bash
pnpm --filter @aperio-j/desktop signing:windows-cert
# sets APERIO_J_WIN_CERT_PFX + password — see script output
pnpm build:desktop
```

`tauri.windows.conf.json` calls `scripts/signing/sign-windows.mjs`. If `APERIO_J_WIN_CERT_PFX` is unset, signing is skipped (unsigned build still succeeds). Self-signed certs reduce friction for friends/OSS users who install the cert once; SmartScreen may still warn until trusted.

### macOS / Linux desktop

- **macOS:** `tauri.macos.conf.json` uses ad-hoc signing (`signingIdentity: "-"`). For Gatekeeper-friendly distribution, replace with your Developer ID and notarization (optional, paid).
- **Linux:** AppImage/deb/rpm need no code signing.

### Android

```bash
# Local override only — CI uses apps/desktop/signing/android-upload.jks
pnpm --filter @aperio-j/desktop signing:android-keystore
pnpm --filter @aperio-j/desktop signing:android-props
pnpm build:android
```

Default CI keystore: `apps/desktop/signing/android-upload.jks` (alias `aperio-j-upload`, password `aperio-j-local`). Friends sideload the release APK with「允许安装未知来源」— no app store or 备案 required.

### iOS

Set `APPLE_DEVELOPMENT_TEAM` (and optionally `APPLE_SIGNING_IDENTITY`). Free Apple IDs support on-device testing; App Store distribution needs the Apple Developer Program.

## Platform config files

Merged automatically by the Tauri CLI:

| File | Purpose |
|------|---------|
| `tauri.conf.json` | Shared app metadata, desktop bundle (server + Node sidecar) |
| `tauri.windows.conf.json` | Optional Windows `signCommand` |
| `tauri.macos.conf.json` | Ad-hoc macOS signing |
| `tauri.linux.conf.json` | Linux bundle tweaks |
| `tauri.android.conf.json` | Strips sidecar/resources for mobile |
| `tauri.ios.conf.json` | Strips sidecar/resources for mobile |

## Project layout

```
apps/desktop/
  scripts/
    prepare-server.mjs       # Next standalone → src-tauri/server
    ensure-node-sidecar.mjs  # Dev/build placeholder + Node binary
    signing/                 # OSS self-signing helpers
  src-tauri/
    src/lib.rs               # Desktop: spawn Node sidecar in release
    gen/android/             # Generated Gradle project (android init)
    capabilities/
      default.json           # Desktop (shell plugin)
      mobile.json            # Android / iOS
```

**Last updated:** 2026-07-04
