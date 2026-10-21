use moderniptvplayer_native_player::NativePlayer;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{Manager, State};

#[cfg(target_os = "windows")]
mod video_surface {
    use std::ptr::{null, null_mut};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, SetWindowPos, HWND_TOP, SWP_NOACTIVATE, SWP_NOOWNERZORDER, WS_CHILD,
        WS_CLIPSIBLINGS, WS_VISIBLE,
    };

    pub fn create(parent: isize) -> Result<isize, String> {
        let class_name: Vec<u16> = "STATIC\0".encode_utf16().collect();
        let title: Vec<u16> = "\0".encode_utf16().collect();
        let handle = unsafe {
            CreateWindowExW(
                0, class_name.as_ptr(), title.as_ptr(),
                WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS,
                0, 0, 1, 1, parent as _, null_mut(), null_mut(), null(),
            )
        };
        if handle.is_null() {
            Err("Windows could not create the native video surface.".to_string())
        } else {
            Ok(handle as isize)
        }
    }

    pub fn resize(handle: isize, x: i32, y: i32, width: i32, height: i32) -> Result<(), String> {
        let success = unsafe {
            SetWindowPos(handle as _, HWND_TOP, x, y, width, height,
                SWP_NOACTIVATE | SWP_NOOWNERZORDER)
        };
        if success == 0 {
            Err("Windows could not resize the native video surface.".to_string())
        } else {
            Ok(())
        }
    }
}

struct PlayerState {
    player: Mutex<NativePlayer>,
    video_surface: Option<isize>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlayerStatus {
    paused: bool,
    position_seconds: Option<f64>,
    duration_seconds: Option<f64>,
}

#[tauri::command]
fn player_load(source: String, state: State<'_, PlayerState>) -> Result<(), String> {
    state.player.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .load(&source).map_err(|error| error.to_string())
}

#[tauri::command]
fn player_set_paused(paused: bool, state: State<'_, PlayerState>) -> Result<(), String> {
    state.player.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .set_paused(paused).map_err(|error| error.to_string())
}

#[tauri::command]
fn player_set_volume(volume: f64, state: State<'_, PlayerState>) -> Result<(), String> {
    state.player.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .set_volume(volume).map_err(|error| error.to_string())
}

#[tauri::command]
fn player_seek(position_seconds: f64, state: State<'_, PlayerState>) -> Result<(), String> {
    state.player.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .seek_absolute(position_seconds).map_err(|error| error.to_string())
}

#[tauri::command]
fn player_stop(state: State<'_, PlayerState>) -> Result<(), String> {
    state.player.lock().map_err(|_| "Player lock is unavailable".to_string())?
        .stop().map_err(|error| error.to_string())
}

#[tauri::command]
fn player_status(state: State<'_, PlayerState>) -> Result<PlayerStatus, String> {
    let player = state.player.lock().map_err(|_| "Player lock is unavailable".to_string())?;
    let paused = player.paused().map_err(|error| error.to_string())?;
    let position_seconds = player.position_seconds().ok().filter(|value| value.is_finite());
    let duration_seconds = player.duration_seconds().ok().filter(|value| value.is_finite());
    Ok(PlayerStatus { paused, position_seconds, duration_seconds })
}

#[tauri::command]
fn player_set_video_bounds(x: f64, y: f64, width: f64, height: f64, state: State<'_, PlayerState>) -> Result<(), String> {
    if ![x, y, width, height].iter().all(|v| v.is_finite())
        || x < 0.0 || y < 0.0 || width <= 0.0 || height <= 0.0 {
        return Err("The native video rectangle is invalid.".to_string());
    }
    let x = x.round().min(i32::MAX as f64) as i32;
    let y = y.round().min(i32::MAX as f64) as i32;
    let width = width.round().clamp(1.0, i32::MAX as f64) as i32;
    let height = height.round().clamp(1.0, i32::MAX as f64) as i32;

    #[cfg(target_os = "windows")]
    {
        let handle = state.video_surface.ok_or_else(|| "The native video surface is unavailable.".to_string())?;
        video_surface::resize(handle, x, y, width, height)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (x, y, width, height, &state);
        Err("Native video embedding is currently supported on Windows only.".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "windows")]
            let (player, video_surface) = {
                use tauri::window::WindowExtWindows;
                let window = app.get_webview_window("main")
                    .ok_or_else(|| std::io::Error::other("Main desktop window was not found."))?;
                let parent = window.hwnd()?;
                let surface = video_surface::create(parent.0 as isize).map_err(std::io::Error::other)?;
                let player = NativePlayer::new_with_window(surface).map_err(std::io::Error::other)?;
                (player, Some(surface))
            };
            #[cfg(not(target_os = "windows"))]
            let (player, video_surface) = (
                NativePlayer::new().map_err(std::io::Error::other)?,
                None,
            );

            app.manage(PlayerState { player: Mutex::new(player), video_surface });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            player_load, player_set_paused, player_set_volume, player_seek,
            player_stop, player_status, player_set_video_bounds
        ])
        .run(tauri::generate_context!())
        .expect("error while running Modern IPTV Player");
}
