// No console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! The spike's backend. The page talks to libmpv only through the narrow
//! commands below: there is no raw mpv command channel (mpv can run programs).
//!
//! Embedded mode hands the main window's handle to mpv (`wid`): mpv draws in
//! its own child window and the page keeps the picture inside a rectangle by
//! telling mpv how much margin to leave on each side. This is the technique of
//! tauri-plugin-libmpv, which documents it as tested on Windows.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use mpv_engine::{redact_urls, EndReason, Event, Library, Player, PlayerOptions, PropValue, SeekMode, Track, TrackKind};
use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow, WindowEvent};

struct Session {
    player: Arc<Player>,
    stop: Arc<AtomicBool>,
    pump: Option<JoinHandle<()>>,
    embedded: bool,
}

#[derive(Default)]
struct AppState {
    session: Mutex<Option<Session>>,
}

fn lock(state: &AppState) -> std::sync::MutexGuard<'_, Option<Session>> {
    state.session.lock().unwrap_or_else(|e| e.into_inner())
}

fn player(state: &State<AppState>) -> Result<Arc<Player>, String> {
    lock(state).as_ref().map(|s| s.player.clone()).ok_or_else(|| "the player is not started: use one of the Start buttons".to_string())
}

fn shutdown(state: &AppState) {
    let session = lock(state).take();
    if let Some(mut session) = session {
        session.stop.store(true, Ordering::Relaxed);
        if let Some(pump) = session.pump.take() {
            let _ = pump.join();
        }
        // Dropping the player stops playback and closes the stream.
    }
}

// ---------------------------------------------------------------- libmpv --

fn library_file_name() -> &'static str {
    if cfg!(windows) {
        "libmpv-2.dll"
    } else if cfg!(target_os = "macos") {
        "libmpv.2.dylib"
    } else {
        "libmpv.so.2"
    }
}

fn open_library(app: &AppHandle) -> Result<Arc<Library>, String> {
    let name = library_file_name();
    let mut paths: Vec<PathBuf> = Vec::new();
    if let Ok(dir) = app.path().resource_dir() {
        paths.push(dir.join("lib").join(name));
        paths.push(dir.join(name));
    }
    if let Some(dir) = std::env::current_exe().ok().and_then(|e| e.parent().map(|p| p.to_path_buf())) {
        paths.push(dir.join("lib").join(name));
        paths.push(dir.join(name));
    }
    // `tauri dev`: the folder next to Cargo.toml.
    paths.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("lib").join(name));
    paths.push(PathBuf::from(name));
    Library::open_first(&paths).map_err(|e| format!("{e}\n\nPut {name} in desktop/src-tauri/lib/ (see desktop/README.md)."))
}

#[cfg(windows)]
fn window_handle(window: &WebviewWindow) -> Result<String, String> {
    window.hwnd().map(|h| (h.0 as isize).to_string()).map_err(|e| e.to_string())
}

#[cfg(not(windows))]
fn window_handle(_: &WebviewWindow) -> Result<String, String> {
    Err("embedded video is only implemented for Windows in this spike: use the separate window mode".into())
}

// ---------------------------------------------------------------- events --

fn reason_name(reason: EndReason) -> &'static str {
    match reason {
        EndReason::Eof => "eof",
        EndReason::Stop => "stop",
        EndReason::Quit => "quit",
        EndReason::Error => "error",
        EndReason::Redirect => "redirect",
        EndReason::Unknown(_) => "unknown",
    }
}

fn track_json(t: &Track) -> Value {
    json!({
        "id": t.id,
        "kind": match t.kind { TrackKind::Video => "video", TrackKind::Audio => "audio", TrackKind::Sub => "sub" },
        "codec": t.codec, "lang": t.lang, "title": t.title, "default": t.default, "selected": t.selected,
        "channels": t.channels, "width": t.width, "height": t.height,
    })
}

fn to_payload(player: &Player, event: Event) -> Option<Value> {
    Some(match event {
        Event::None | Event::Other(_) => return None,
        Event::Shutdown => json!({ "type": "shutdown" }),
        Event::StartFile => json!({ "type": "start-file" }),
        Event::Seek => json!({ "type": "seek" }),
        Event::PlaybackRestart => json!({ "type": "playback-restart" }),
        Event::FileLoaded => {
            let tracks: Vec<Value> = player.tracks().unwrap_or_default().iter().map(track_json).collect();
            json!({ "type": "file-loaded", "tracks": tracks })
        }
        Event::EndFile { reason, error } => json!({
            "type": "end-file",
            "reason": reason_name(reason),
            "error": error,
            "httpStatus": if reason == EndReason::Error { player.last_http_status() } else { None },
        }),
        Event::Property { name, value } => {
            let value = match value {
                PropValue::Unavailable => Value::Null,
                PropValue::Bool(b) => json!(b),
                PropValue::Int(i) => json!(i),
                PropValue::Double(d) => json!(d),
                PropValue::Text(t) => json!(t),
            };
            json!({ "type": "property", "name": name, "value": value })
        }
        // URLs in mpv's log carry the account: only hosts leave this process.
        Event::Log { level, prefix, text } => json!({ "type": "log", "level": level, "text": redact_urls(&format!("[{prefix}] {text}")) }),
    })
}

fn spawn_pump(app: AppHandle, player: Arc<Player>, stop: Arc<AtomicBool>) -> JoinHandle<()> {
    std::thread::spawn(move || {
        while !stop.load(Ordering::Relaxed) {
            let event = player.next_event(0.2);
            if let Some(payload) = to_payload(&player, event) {
                let _ = app.emit("mpv-event", payload);
            }
        }
    })
}

// -------------------------------------------------------------- commands --

#[derive(Serialize)]
struct InitInfo {
    version: String,
    api: String,
    embedded: bool,
    /// Decoders this libmpv has for the codecs browsers struggle with.
    decoders: Vec<(String, bool)>,
}

#[tauri::command]
fn mpv_init(app: AppHandle, window: WebviewWindow, state: State<AppState>, embed: bool) -> Result<InitInfo, String> {
    shutdown(&state);
    let lib = open_library(&app)?;
    let mut options = PlayerOptions::default();
    if embed {
        options.extra.push(("wid".into(), window_handle(&window)?));
    } else {
        options.extra.push(("force-window".into(), "no".into()));
        options.extra.push(("title".into(), "ModernIPTV spike: video".into()));
    }
    let player = Arc::new(Player::new(lib, &options).map_err(|e| e.to_string())?);
    let (major, minor) = player.library().api_version();
    let available = player.decoders().unwrap_or_default();
    let decoders = ["h264", "hevc", "aac", "ac3", "eac3", "dts", "truehd", "vp9", "av1"]
        .iter()
        .map(|c| (c.to_string(), available.iter().any(|d| d == c)))
        .collect();
    let info = InitInfo { version: player.version().unwrap_or_default(), api: format!("{major}.{minor}"), embedded: embed, decoders };

    let stop = Arc::new(AtomicBool::new(false));
    let pump = spawn_pump(app, player.clone(), stop.clone());
    *lock(&state) = Some(Session { player, stop, pump: Some(pump), embedded: embed });
    Ok(info)
}

#[tauri::command]
fn mpv_load(state: State<AppState>, url: String, start: Option<f64>) -> Result<(), String> {
    player(&state)?.load(url.trim(), start).map_err(|e| e.to_string())
}

#[tauri::command]
fn mpv_pause(state: State<AppState>, paused: bool) -> Result<(), String> {
    player(&state)?.pause(paused).map_err(|e| e.to_string())
}

#[tauri::command]
fn mpv_seek(state: State<AppState>, seconds: f64, relative: bool) -> Result<(), String> {
    let mode = if relative { SeekMode::Relative } else { SeekMode::Absolute };
    player(&state)?.seek(seconds, mode).map_err(|e| e.to_string())
}

#[tauri::command]
fn mpv_stop(state: State<AppState>) -> Result<(), String> {
    player(&state)?.stop().map_err(|e| e.to_string())
}

#[tauri::command]
fn mpv_volume(state: State<AppState>, percent: f64) -> Result<(), String> {
    player(&state)?.set_volume(percent).map_err(|e| e.to_string())
}

#[tauri::command]
fn mpv_audio_track(state: State<AppState>, id: Option<i64>) -> Result<(), String> {
    player(&state)?.select_audio(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn mpv_sub_track(state: State<AppState>, id: Option<i64>) -> Result<(), String> {
    player(&state)?.select_subtitle(id).map_err(|e| e.to_string())
}

/// Fractions of the window left free on each side; the picture is drawn in
/// what remains, which is where the page keeps its transparent area.
#[tauri::command]
fn mpv_video_margins(state: State<AppState>, left: f64, right: f64, top: f64, bottom: f64) -> Result<(), String> {
    player(&state)?.set_video_margins(left, right, top, bottom).map_err(|e| e.to_string())
}

#[derive(Serialize)]
struct Info {
    mode: &'static str,
    video_format: Option<String>,
    video_codec: Option<String>,
    audio_codec: Option<String>,
    hwdec: Option<String>,
    size: Option<String>,
    fps: Option<String>,
    vo: Option<String>,
    ao: Option<String>,
}

fn collect_info(state: &State<AppState>) -> Result<Info, String> {
    let (player, embedded) = {
        let guard = lock(state);
        let s = guard.as_ref().ok_or_else(|| "the player is not started".to_string())?;
        (s.player.clone(), s.embedded)
    };
    let (w, h) = (player.property("width"), player.property("height"));
    Ok(Info {
        mode: if embedded { "embedded" } else { "separate window" },
        video_format: player.property("video-format"),
        video_codec: player.property("video-codec"),
        audio_codec: player.property("audio-codec-name"),
        hwdec: player.property("hwdec-current"),
        size: w.zip(h).map(|(w, h)| format!("{w}x{h}")),
        fps: player.property("container-fps"),
        vo: player.property("current-vo"),
        ao: player.property("current-ao"),
    })
}

#[tauri::command]
fn mpv_info(state: State<AppState>) -> Result<Info, String> {
    collect_info(&state)
}

/// A text report to paste in a bug report. Nothing in it identifies an account:
/// URLs are cut down to their host, and the stream URL itself is never kept.
#[tauri::command]
fn mpv_report(state: State<AppState>) -> Result<String, String> {
    let info = collect_info(&state)?;
    let player = player(&state)?;
    let (major, minor) = player.library().api_version();
    let show = |v: &Option<String>| v.clone().unwrap_or_else(|| "-".into());
    let mut out = String::new();
    out.push_str("ModernIPTV Desktop spike report\n");
    out.push_str(&format!("os: {} {}\n", std::env::consts::OS, std::env::consts::ARCH));
    out.push_str(&format!("mode: {}\n", info.mode));
    out.push_str(&format!("libmpv: {} (client API {major}.{minor})\n", player.version().unwrap_or_default()));
    let available = player.decoders().unwrap_or_default();
    let decoders: Vec<String> = ["h264", "hevc", "aac", "ac3", "eac3", "dts", "truehd", "vp9", "av1"]
        .iter()
        .map(|c| format!("{c}={}", if available.iter().any(|d| d == c) { "yes" } else { "NO" }))
        .collect();
    out.push_str(&format!("decoders: {}\n", decoders.join(" ")));
    out.push_str(&format!(
        "now: video-format={} video-codec={} audio-codec={} hwdec={} size={} fps={} vo={} ao={}\n",
        show(&info.video_format), show(&info.video_codec), show(&info.audio_codec), show(&info.hwdec), show(&info.size), show(&info.fps), show(&info.vo), show(&info.ao)
    ));
    out.push_str(&format!("position: {:?} / {:?} s\n", player.position(), player.duration()));
    out.push_str(&format!("dropped frames: decoder={} output={}\n", show(&player.property("decoder-frame-drop-count")), show(&player.property("frame-drop-count"))));
    out.push_str(&format!("last HTTP status in the log: {:?}\n", player.last_http_status()));
    out.push_str("tracks:\n");
    for t in player.tracks().unwrap_or_default() {
        out.push_str(&format!(
            "  {} #{} codec={} lang={} {}x{} ch={} {}\n",
            match t.kind { TrackKind::Video => "video", TrackKind::Audio => "audio", TrackKind::Sub => "sub" },
            t.id, t.codec.unwrap_or_else(|| "-".into()), t.lang.unwrap_or_else(|| "-".into()),
            t.width.unwrap_or(0), t.height.unwrap_or(0), t.channels.unwrap_or(0), if t.selected { "selected" } else { "" }
        ));
    }
    out.push_str("log (latest lines, URLs reduced to their host):\n");
    let logs = player.recent_logs();
    for line in logs.iter().rev().take(60).rev() {
        out.push_str("  ");
        out.push_str(&redact_urls(line));
        out.push('\n');
    }
    Ok(out)
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            mpv_init, mpv_load, mpv_pause, mpv_seek, mpv_stop, mpv_volume, mpv_audio_track, mpv_sub_track, mpv_video_margins, mpv_info, mpv_report
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed = event {
                shutdown(&window.state::<AppState>());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
