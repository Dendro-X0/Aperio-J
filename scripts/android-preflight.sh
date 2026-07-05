#!/usr/bin/env bash
# Fast Android toolchain check (~10s). Run in WSL/Linux with ANDROID_HOME + NDK_HOME set.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRADLEW="$ROOT/apps/desktop/src-tauri/gen/android/gradlew"
ANDROID_DIR="$(dirname "$GRADLEW")"

if [[ ! -f "$GRADLEW" ]]; then
  echo "android-preflight: missing $GRADLEW — run pnpm --filter @aperio-j/desktop android:init"
  exit 1
fi

sed -i 's/\r$//' "$GRADLEW"
chmod +x "$GRADLEW"

echo "android-preflight: java"
java -version

if [[ -z "${ANDROID_HOME:-}" ]]; then
  echo "android-preflight: ANDROID_HOME is not set"
  exit 1
fi

if [[ -z "${NDK_HOME:-}" ]]; then
  echo "android-preflight: NDK_HOME is not set"
  exit 1
fi

echo "android-preflight: ANDROID_HOME=$ANDROID_HOME"
echo "android-preflight: NDK_HOME=$NDK_HOME"

echo "android-preflight: gradle wrapper"
(cd "$ANDROID_DIR" && ./gradlew --version)

echo "android-preflight: ok"
