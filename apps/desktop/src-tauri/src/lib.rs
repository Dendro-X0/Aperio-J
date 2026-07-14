#[cfg(not(mobile))]
use std::{
  net::TcpStream,
  sync::Mutex,
  time::Duration,
};

use tauri::{Manager, RunEvent};
#[cfg(not(mobile))]
use tauri_plugin_shell::{process::CommandChild, ShellExt};

#[cfg(not(mobile))]
const SERVER_PORT: u16 = 3010;

#[cfg(not(mobile))]
const SERVER_HOST: &str = "127.0.0.1";

#[cfg(not(mobile))]
struct SidecarState(Mutex<Option<CommandChild>>);

#[cfg(not(mobile))]
fn wait_for_server(port: u16) -> Result<(), String> {
  let address = format!("{SERVER_HOST}:{port}");
  for _ in 0..120 {
    if TcpStream::connect(&address).is_ok() {
      return Ok(());
    }
    std::thread::sleep(Duration::from_millis(250));
  }
  Err(format!("Timed out waiting for web server at http://{address}"))
}

#[cfg(not(mobile))]
fn bundled_server_entry(app: &tauri::App) -> Result<std::path::PathBuf, String> {
  let resource_dir = app
    .path()
    .resource_dir()
    .map_err(|error| error.to_string())?;
  Ok(resource_dir.join("server").join("apps").join("web").join("server.js"))
}

#[cfg(not(mobile))]
fn has_bundled_local_server(app: &tauri::App) -> bool {
  bundled_server_entry(app)
    .ok()
    .is_some_and(|path| path.is_file())
}

#[cfg(not(mobile))]
fn spawn_sidecar(app: &tauri::App, port: u16) -> Result<CommandChild, String> {
  let server_js = bundled_server_entry(app)?;
  if !server_js.is_file() {
    return Err(format!("Missing bundled server entry: {}", server_js.display()));
  }

  let resource_dir = server_js
    .parent()
    .and_then(|web| web.parent())
    .and_then(|apps| apps.parent())
    .ok_or_else(|| "Invalid bundled server path".to_string())?;

  let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?;
  std::fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
  let db_path = app_data_dir.join("aperio-j.db");

  let sidecar = app
    .handle()
    .shell()
    .sidecar("node")
    .map_err(|error| error.to_string())?
    .args(["apps/web/server.js"])
    .current_dir(resource_dir)
    .env("HOSTNAME", SERVER_HOST)
    .env("PORT", port.to_string())
    .env(
      "DATABASE_URL",
      format!("file:{}", db_path.to_string_lossy().replace('\\', "/")),
    )
    .env("NODE_ENV", "production");

  let (_rx, child) = sidecar
    .spawn()
    .map_err(|error| format!("Failed to start bundled web server: {error}"))?;

  Ok(child)
}

#[cfg(not(mobile))]
fn setup_desktop_release(app: &tauri::App) -> Result<(), String> {
  if !has_bundled_local_server(app) {
    log::info!("Thin desktop shell — loading hosted web UI (no local sidecar)");
    return Ok(());
  }

  let child = spawn_sidecar(app, SERVER_PORT)?;
  wait_for_server(SERVER_PORT)?;

  if let Ok(mut guard) = app.state::<SidecarState>().0.lock() {
    *guard = Some(child);
  }

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default();

  #[cfg(not(mobile))]
  let builder = builder
    .plugin(tauri_plugin_shell::init())
    .manage(SidecarState(Mutex::new(None)));

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
        return Ok(());
      }

      #[cfg(not(mobile))]
      setup_desktop_release(app)?;

      #[cfg(mobile)]
      log::warn!(
        "aperio-j mobile release builds load the bundled web UI only; \
         run `pnpm dev:android` / `pnpm dev:ios` against the Next dev server, \
         or point the webview at a self-hosted instance."
      );

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while running tauri application")
    .run(|app_handle, event| {
      if let RunEvent::Exit = event {
        #[cfg(not(mobile))]
        if let Some(state) = app_handle.try_state::<SidecarState>() {
          if let Ok(mut guard) = state.0.lock() {
            if let Some(child) = guard.take() {
              let _ = child.kill();
            }
          }
        }
      }
    });
}
