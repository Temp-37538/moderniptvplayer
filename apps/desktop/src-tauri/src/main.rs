use moderniptvplayer_native_player::NativePlayer;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

struct PlayerState(Mutex<NativePlayer>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlayerStatus {
    paused: bool,
    position_seconds: Option<f64>,
    duration_seconds: Option<f64>,
}

#[tauri::command]
fn player_load(source: String, state: State<'_, PlayerState>) -> Result<(), String> {
    state.0.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .load(&source).map_err(|error| error.to_string())
}

#[tauri::command]
fn player_set_paused(paused: bool, state: State<'_, PlayerState>) -> Result<(), String> {
    state.0.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .set_paused(paused).map_err(|error| error.to_string())
}

#[tauri::command]
fn player_set_volume(volume: f64, state: State<'_, PlayerState>) -> Result<(), String> {
    state.0.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .set_volume(volume).map_err(|error| error.to_string())
}

#[tauri::command]
fn player_seek(position_seconds: f64, state: State<'_, PlayerState>) -> Result<(), String> {
    state.0.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .seek_absolute(position_seconds).map_err(|error| error.to_string())
}

#[tauri::command]
fn player_stop(state: State<'_, PlayerState>) -> Result<(), String> {
    state.0.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .stop().map_err(|error| error.to_string())
}

#[tauri::command]
fn player_status(state: State<'_, PlayerState>) -> Result<PlayerStatus, String> {
    let player = state.0.lock().map_err(|_| "Player lock is unavailable".to_string())?;
    let paused = player.paused().map_err(|error| error.to_string())?;
    let position_seconds = player.position_seconds().ok().filter(|value| value.is_finite());
    let duration_seconds = player.duration_seconds().ok().filter(|value| value.is_finite());
    Ok(PlayerStatus { paused, position_seconds, duration_seconds })
}

fn main() {
    let player = NativePlayer::new().expect("Failed to initialize libmpv");
    tauri::Builder::default()
        .manage(PlayerState(Mutex::new(player)))
        .invoke_handler(tauri::generate_handler![
            player_load,
            player_set_paused,
            player_set_volume,
            player_seek,
            player_stop,
            player_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running Modern IPTV Player");
}
