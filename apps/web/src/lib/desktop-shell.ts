/** True when the UI runs inside a Tauri desktop webview. */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}
