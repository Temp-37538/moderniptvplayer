//! A thin, safe layer over libmpv's client API.
//!
//! libmpv is loaded at run time (`libmpv-2.dll`, `libmpv.so.2`,
//! `libmpv.2.dylib`) rather than linked: the application ships an LGPL build
//! next to its executable, a missing library is a clean error instead of a
//! crash at start-up, and no mpv source is part of this crate.
//!
//! The surface is deliberately small. mpv can run programs (`run` command) and
//! load scripts, so [`Player`] never exposes a raw command channel: it offers
//! `load`, `pause`, `seek`, track selection and properties, and only accepts
//! http(s) URLs.

use std::collections::VecDeque;
use std::ffi::{c_char, c_int, c_void, CStr, CString};
use std::path::Path;
use std::ptr::NonNull;
use std::sync::{Arc, Mutex};

use serde::Deserialize;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("libmpv could not be loaded: {0}")]
    Load(String),
    #[error("libmpv: {message} (code {code})")]
    Mpv { code: i32, message: String },
    #[error("only http and https URLs can be played")]
    UnsupportedUrl,
    #[error("text contains a NUL byte")]
    Nul,
    #[error("could not read libmpv's answer: {0}")]
    Decode(String),
}

pub type Result<T> = std::result::Result<T, Error>;

// ---------------------------------------------------------------- raw FFI --

#[repr(C)]
struct Handle {
    _private: [u8; 0],
}

#[repr(C)]
struct RawEvent {
    event_id: c_int,
    error: c_int,
    reply_userdata: u64,
    data: *mut c_void,
}

#[repr(C)]
struct RawEventProperty {
    name: *const c_char,
    format: c_int,
    data: *mut c_void,
}

#[repr(C)]
struct RawEventLogMessage {
    prefix: *const c_char,
    level: *const c_char,
    text: *const c_char,
    log_level: c_int,
}

#[repr(C)]
struct RawEventEndFile {
    reason: c_int,
    error: c_int,
}

const FORMAT_STRING: c_int = 1;
const FORMAT_FLAG: c_int = 3;
const FORMAT_INT64: c_int = 4;
const FORMAT_DOUBLE: c_int = 5;

const EVENT_SHUTDOWN: c_int = 1;
const EVENT_LOG_MESSAGE: c_int = 2;
const EVENT_START_FILE: c_int = 6;
const EVENT_END_FILE: c_int = 7;
const EVENT_FILE_LOADED: c_int = 8;
const EVENT_SEEK: c_int = 20;
const EVENT_PLAYBACK_RESTART: c_int = 21;
const EVENT_PROPERTY_CHANGE: c_int = 22;

type CreateFn = unsafe extern "C" fn() -> *mut Handle;
type InitializeFn = unsafe extern "C" fn(*mut Handle) -> c_int;
type TerminateDestroyFn = unsafe extern "C" fn(*mut Handle);
type SetStringFn = unsafe extern "C" fn(*mut Handle, *const c_char, *const c_char) -> c_int;
type GetPropertyStringFn = unsafe extern "C" fn(*mut Handle, *const c_char) -> *mut c_char;
type GetPropertyFn = unsafe extern "C" fn(*mut Handle, *const c_char, c_int, *mut c_void) -> c_int;
type CommandFn = unsafe extern "C" fn(*mut Handle, *mut *const c_char) -> c_int;
type ObserveFn = unsafe extern "C" fn(*mut Handle, u64, *const c_char, c_int) -> c_int;
type WaitEventFn = unsafe extern "C" fn(*mut Handle, f64) -> *mut RawEvent;
type RequestLogFn = unsafe extern "C" fn(*mut Handle, *const c_char) -> c_int;
type FreeFn = unsafe extern "C" fn(*mut c_void);
type ErrorStringFn = unsafe extern "C" fn(c_int) -> *const c_char;
type ApiVersionFn = unsafe extern "C" fn() -> std::ffi::c_ulong;

/// The loaded library and the functions taken from it.
pub struct Library {
    create: CreateFn,
    initialize: InitializeFn,
    terminate_destroy: TerminateDestroyFn,
    set_option_string: SetStringFn,
    set_property_string: SetStringFn,
    get_property_string: GetPropertyStringFn,
    get_property: GetPropertyFn,
    command: CommandFn,
    observe_property: ObserveFn,
    wait_event: WaitEventFn,
    request_log_messages: RequestLogFn,
    free: FreeFn,
    error_string: ErrorStringFn,
    client_api_version: ApiVersionFn,
    // Never unloaded: libmpv and the libraries behind it (ffmpeg, TLS) keep
    // threads, thread-local destructors and global state that outlive any
    // player. Unloading and reloading it in one process crashes (found by the
    // test suite). The cost is nothing: the application loads it once.
    _lib: std::mem::ManuallyDrop<libloading::Library>,
}

impl Library {
    /// Loads libmpv from an explicit path (e.g. next to the executable).
    pub fn open(path: impl AsRef<Path>) -> Result<Arc<Library>> {
        let path = path.as_ref();
        // SAFETY: loading a shared library runs its initialisers; the caller
        // chooses which file to trust.
        let lib = unsafe { libloading::Library::new(path) }
            .map_err(|e| {
                // Windows' message names no file; Linux's already does.
                let text = e.to_string();
                let shown = path.display().to_string();
                Error::Load(if text.starts_with(&shown) { text } else { format!("{shown}: {text}") })
            })?;

        macro_rules! sym {
            ($name:literal, $ty:ty) => {{
                // SAFETY: the symbol has the signature declared in mpv/client.h.
                let symbol: libloading::Symbol<$ty> = unsafe { lib.get(concat!($name, "\0").as_bytes()) }
                    .map_err(|e| Error::Load(format!("missing symbol {}: {e}", $name)))?;
                *symbol
            }};
        }

        Ok(Arc::new(Library {
            create: sym!("mpv_create", CreateFn),
            initialize: sym!("mpv_initialize", InitializeFn),
            terminate_destroy: sym!("mpv_terminate_destroy", TerminateDestroyFn),
            set_option_string: sym!("mpv_set_option_string", SetStringFn),
            set_property_string: sym!("mpv_set_property_string", SetStringFn),
            get_property_string: sym!("mpv_get_property_string", GetPropertyStringFn),
            get_property: sym!("mpv_get_property", GetPropertyFn),
            command: sym!("mpv_command", CommandFn),
            observe_property: sym!("mpv_observe_property", ObserveFn),
            wait_event: sym!("mpv_wait_event", WaitEventFn),
            request_log_messages: sym!("mpv_request_log_messages", RequestLogFn),
            free: sym!("mpv_free", FreeFn),
            error_string: sym!("mpv_error_string", ErrorStringFn),
            client_api_version: sym!("mpv_client_api_version", ApiVersionFn),
            _lib: std::mem::ManuallyDrop::new(lib),
        }))
    }

    /// Opens the first of `paths` that loads. The error lists every attempt,
    /// which is what a user needs to see when the DLL is missing or one of its
    /// own dependencies (e.g. vulkan-1.dll) cannot be found.
    pub fn open_first(paths: &[std::path::PathBuf]) -> Result<Arc<Library>> {
        let mut attempts = Vec::new();
        for path in paths {
            match Library::open(path) {
                Ok(lib) => return Ok(lib),
                Err(Error::Load(text)) => attempts.push(text),
                Err(other) => attempts.push(other.to_string()),
            }
        }
        Err(Error::Load(if attempts.is_empty() { "no candidate path".into() } else { attempts.join(" | ") }))
    }

    /// Tries the usual file names for this platform, in the current directory
    /// and the executable's directory first.
    pub fn open_default() -> Result<Arc<Library>> {
        let names: &[&str] = if cfg!(windows) {
            &["libmpv-2.dll", "mpv-2.dll"]
        } else if cfg!(target_os = "macos") {
            &["libmpv.2.dylib", "libmpv.dylib"]
        } else {
            &["libmpv.so.2", "libmpv.so"]
        };
        let mut candidates: Vec<std::path::PathBuf> = Vec::new();
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                candidates.extend(names.iter().map(|name| dir.join(name)));
            }
        }
        candidates.extend(names.iter().map(std::path::PathBuf::from));

        let mut last = Error::Load("no candidate".into());
        for candidate in candidates {
            match Library::open(&candidate) {
                Ok(lib) => return Ok(lib),
                Err(e) => last = e,
            }
        }
        Err(last)
    }

    /// `(major, minor)` of mpv's client API.
    pub fn api_version(&self) -> (u32, u32) {
        let v = unsafe { (self.client_api_version)() } as u32;
        (v >> 16, v & 0xffff)
    }

    fn error(&self, code: c_int) -> Error {
        let message = unsafe {
            let p = (self.error_string)(code);
            if p.is_null() {
                String::from("unknown error")
            } else {
                CStr::from_ptr(p).to_string_lossy().into_owned()
            }
        };
        Error::Mpv { code, message }
    }

    fn check(&self, code: c_int) -> Result<()> {
        if code < 0 {
            Err(self.error(code))
        } else {
            Ok(())
        }
    }
}

fn cstring(text: &str) -> Result<CString> {
    CString::new(text).map_err(|_| Error::Nul)
}

// ------------------------------------------------------------------ events --

#[derive(Debug, Clone, PartialEq)]
pub enum PropValue {
    Unavailable,
    Bool(bool),
    Int(i64),
    Double(f64),
    Text(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EndReason {
    Eof,
    Stop,
    Quit,
    Error,
    Redirect,
    Unknown(i32),
}

#[derive(Debug, Clone, PartialEq)]
pub enum Event {
    /// Nothing happened within the timeout.
    None,
    Shutdown,
    StartFile,
    FileLoaded,
    Seek,
    PlaybackRestart,
    EndFile { reason: EndReason, error: Option<String> },
    Property { name: String, value: PropValue },
    Log { level: String, prefix: String, text: String },
    Other(i32),
}

// --------------------------------------------------------------------- Mpv --

/// A libmpv instance. The client API is thread-safe.
pub struct Mpv {
    lib: Arc<Library>,
    handle: NonNull<Handle>,
}

unsafe impl Send for Mpv {}
unsafe impl Sync for Mpv {}

impl Mpv {
    pub fn new(lib: Arc<Library>, options: &[(&str, &str)]) -> Result<Mpv> {
        let raw = unsafe { (lib.create)() };
        let handle = NonNull::new(raw).ok_or_else(|| Error::Load("mpv_create returned NULL".into()))?;
        let mpv = Mpv { lib, handle };
        for (name, value) in options {
            let (n, v) = (cstring(name)?, cstring(value)?);
            let code = unsafe { (mpv.lib.set_option_string)(mpv.handle.as_ptr(), n.as_ptr(), v.as_ptr()) };
            mpv.lib.check(code).map_err(|e| match e {
                Error::Mpv { code, message } => Error::Mpv { code, message: format!("option {name}={value}: {message}") },
                other => other,
            })?;
        }
        mpv.lib.check(unsafe { (mpv.lib.initialize)(mpv.handle.as_ptr()) })?;
        Ok(mpv)
    }

    pub fn library(&self) -> &Arc<Library> {
        &self.lib
    }

    fn command(&self, args: &[&str]) -> Result<()> {
        let owned: Vec<CString> = args.iter().map(|a| cstring(a)).collect::<Result<_>>()?;
        let mut pointers: Vec<*const c_char> = owned.iter().map(|c| c.as_ptr()).collect();
        pointers.push(std::ptr::null());
        let code = unsafe { (self.lib.command)(self.handle.as_ptr(), pointers.as_mut_ptr()) };
        self.lib.check(code)
    }

    fn set_property(&self, name: &str, value: &str) -> Result<()> {
        let (n, v) = (cstring(name)?, cstring(value)?);
        let code = unsafe { (self.lib.set_property_string)(self.handle.as_ptr(), n.as_ptr(), v.as_ptr()) };
        self.lib.check(code)
    }

    fn get_string(&self, name: &str) -> Option<String> {
        let n = cstring(name).ok()?;
        unsafe {
            let p = (self.lib.get_property_string)(self.handle.as_ptr(), n.as_ptr());
            if p.is_null() {
                return None;
            }
            let text = CStr::from_ptr(p).to_string_lossy().into_owned();
            (self.lib.free)(p.cast());
            Some(text)
        }
    }

    fn get_f64(&self, name: &str) -> Option<f64> {
        let n = cstring(name).ok()?;
        let mut value: f64 = 0.0;
        let code = unsafe {
            (self.lib.get_property)(self.handle.as_ptr(), n.as_ptr(), FORMAT_DOUBLE, (&mut value as *mut f64).cast())
        };
        (code >= 0).then_some(value)
    }

    fn observe(&self, id: u64, name: &str, format: c_int) -> Result<()> {
        let n = cstring(name)?;
        self.lib.check(unsafe { (self.lib.observe_property)(self.handle.as_ptr(), id, n.as_ptr(), format) })
    }

    fn request_logs(&self, level: &str) -> Result<()> {
        let l = cstring(level)?;
        self.lib.check(unsafe { (self.lib.request_log_messages)(self.handle.as_ptr(), l.as_ptr()) })
    }

    fn wait_event(&self, timeout_secs: f64) -> Event {
        unsafe {
            let raw = (self.lib.wait_event)(self.handle.as_ptr(), timeout_secs);
            if raw.is_null() {
                return Event::None;
            }
            let ev = &*raw;
            let text = |p: *const c_char| -> String {
                if p.is_null() { String::new() } else { CStr::from_ptr(p).to_string_lossy().into_owned() }
            };
            match ev.event_id {
                0 => Event::None,
                EVENT_SHUTDOWN => Event::Shutdown,
                EVENT_START_FILE => Event::StartFile,
                EVENT_FILE_LOADED => Event::FileLoaded,
                EVENT_SEEK => Event::Seek,
                EVENT_PLAYBACK_RESTART => Event::PlaybackRestart,
                EVENT_END_FILE => {
                    let end = &*(ev.data as *const RawEventEndFile);
                    let reason = match end.reason {
                        0 => EndReason::Eof,
                        2 => EndReason::Stop,
                        3 => EndReason::Quit,
                        4 => EndReason::Error,
                        5 => EndReason::Redirect,
                        other => EndReason::Unknown(other),
                    };
                    let error = (end.error < 0).then(|| match self.lib.error(end.error) {
                        Error::Mpv { message, .. } => message,
                        other => other.to_string(),
                    });
                    Event::EndFile { reason, error }
                }
                EVENT_LOG_MESSAGE => {
                    let log = &*(ev.data as *const RawEventLogMessage);
                    Event::Log {
                        level: text(log.level),
                        prefix: text(log.prefix),
                        text: text(log.text).trim_end().to_string(),
                    }
                }
                EVENT_PROPERTY_CHANGE => {
                    let prop = &*(ev.data as *const RawEventProperty);
                    let value = match prop.format {
                        FORMAT_FLAG if !prop.data.is_null() => PropValue::Bool(*(prop.data as *const c_int) != 0),
                        FORMAT_INT64 if !prop.data.is_null() => PropValue::Int(*(prop.data as *const i64)),
                        FORMAT_DOUBLE if !prop.data.is_null() => PropValue::Double(*(prop.data as *const f64)),
                        FORMAT_STRING if !prop.data.is_null() => PropValue::Text(text(*(prop.data as *const *const c_char))),
                        _ => PropValue::Unavailable,
                    };
                    Event::Property { name: text(prop.name), value }
                }
                other => Event::Other(other),
            }
        }
    }
}

impl Drop for Mpv {
    fn drop(&mut self) {
        // Stops playback and closes the network connection.
        unsafe { (self.lib.terminate_destroy)(self.handle.as_ptr()) }
    }
}

// ------------------------------------------------------------------ Player --

#[derive(Debug, Clone)]
pub struct PlayerOptions {
    /// No window and no sound device (tests, servers).
    pub headless: bool,
    pub hwdec: String,
    pub user_agent: Option<String>,
    /// Seconds without network data before giving up.
    pub network_timeout_secs: u32,
    /// Extra `name=value` options, applied last (tests).
    pub extra: Vec<(String, String)>,
}

impl Default for PlayerOptions {
    fn default() -> Self {
        PlayerOptions { headless: false, hwdec: "auto-safe".into(), user_agent: None, network_timeout_secs: 15, extra: Vec::new() }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SeekMode {
    Absolute,
    Relative,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrackKind {
    Video,
    Audio,
    Sub,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Track {
    pub id: i64,
    #[serde(rename = "type")]
    pub kind: TrackKind,
    pub codec: Option<String>,
    pub lang: Option<String>,
    pub title: Option<String>,
    #[serde(default)]
    pub default: bool,
    #[serde(default)]
    pub selected: bool,
    #[serde(rename = "demux-channel-count")]
    pub channels: Option<i64>,
    #[serde(rename = "demux-w")]
    pub width: Option<i64>,
    #[serde(rename = "demux-h")]
    pub height: Option<i64>,
}

const LOG_LINES_KEPT: usize = 80;

pub struct Player {
    mpv: Mpv,
    logs: Mutex<VecDeque<String>>,
}

impl Player {
    pub fn new(lib: Arc<Library>, options: &PlayerOptions) -> Result<Player> {
        // ffmpeg's protocol whitelist, so that a playlist (HLS) fetched over
        // http cannot make the player read local files or other schemes.
        // `%25%` is mpv's length prefix, needed because the value has commas.
        let whitelist = "protocol_whitelist=%25%http,https,tcp,tls,crypto";
        let mut opts: Vec<(String, String)> = vec![
            // Nothing from the user's own mpv set-up, and no scripts or
            // youtube-dl hooks: the player does what the application says.
            ("config".into(), "no".into()),
            ("load-scripts".into(), "no".into()),
            ("ytdl".into(), "no".into()),
            ("osc".into(), "no".into()),
            ("osd-level".into(), "0".into()),
            ("terminal".into(), "no".into()),
            ("input-default-bindings".into(), "no".into()),
            ("input-vo-keyboard".into(), "no".into()),
            ("idle".into(), "yes".into()),
            ("keep-open".into(), "no".into()),
            ("cache".into(), "yes".into()),
            ("hwdec".into(), options.hwdec.clone()),
            ("network-timeout".into(), options.network_timeout_secs.to_string()),
            ("demuxer-lavf-o".into(), whitelist.into()),
            ("stream-lavf-o".into(), whitelist.into()),
        ];
        if options.headless {
            opts.push(("vo".into(), "null".into()));
            opts.push(("ao".into(), "null".into()));
        }
        if let Some(ua) = &options.user_agent {
            opts.push(("user-agent".into(), ua.clone()));
        }
        opts.extend(options.extra.iter().cloned());

        let borrowed: Vec<(&str, &str)> = opts.iter().map(|(a, b)| (a.as_str(), b.as_str())).collect();
        let mpv = Mpv::new(lib, &borrowed)?;
        mpv.request_logs("info")?;
        for (id, name, format) in [
            (1, "time-pos", FORMAT_DOUBLE),
            (2, "duration", FORMAT_DOUBLE),
            (3, "pause", FORMAT_FLAG),
            (4, "paused-for-cache", FORMAT_FLAG),
            (5, "eof-reached", FORMAT_FLAG),
        ] {
            mpv.observe(id, name, format)?;
        }
        Ok(Player { mpv, logs: Mutex::new(VecDeque::new()) })
    }

    pub fn library(&self) -> &Arc<Library> {
        self.mpv.library()
    }

    /// mpv's own version string, e.g. `mpv 0.37.0`.
    pub fn version(&self) -> Option<String> {
        self.mpv.get_string("mpv-version")
    }

    /// Loads an http(s) stream, optionally starting at `start` seconds.
    pub fn load(&self, url: &str, start: Option<f64>) -> Result<()> {
        let lower = url.to_ascii_lowercase();
        let allowed = lower.starts_with("http://") || lower.starts_with("https://");
        if !allowed || url.len() > 4096 || url.chars().any(|c| c.is_control() || c.is_whitespace()) {
            return Err(Error::UnsupportedUrl);
        }
        // A property rather than a `loadfile` option: the syntax of that
        // command changed between mpv 0.37 and 0.38.
        self.mpv.set_property("options/start", &start.filter(|s| *s > 0.0).map_or("none".into(), |s| format!("{s:.3}")))?;
        self.mpv.command(&["loadfile", url, "replace"])
    }

    pub fn pause(&self, paused: bool) -> Result<()> {
        self.mpv.set_property("pause", if paused { "yes" } else { "no" })
    }

    pub fn seek(&self, seconds: f64, mode: SeekMode) -> Result<()> {
        let mode = match mode {
            SeekMode::Absolute => "absolute",
            SeekMode::Relative => "relative",
        };
        self.mpv.command(&["seek", &format!("{seconds:.3}"), mode])
    }

    pub fn stop(&self) -> Result<()> {
        self.mpv.command(&["stop"])
    }

    pub fn set_volume(&self, percent: f64) -> Result<()> {
        self.mpv.set_property("volume", &format!("{:.1}", percent.clamp(0.0, 130.0)))
    }

    pub fn set_muted(&self, muted: bool) -> Result<()> {
        self.mpv.set_property("mute", if muted { "yes" } else { "no" })
    }

    pub fn position(&self) -> Option<f64> {
        self.mpv.get_f64("time-pos")
    }

    pub fn duration(&self) -> Option<f64> {
        self.mpv.get_f64("duration")
    }

    pub fn tracks(&self) -> Result<Vec<Track>> {
        match self.mpv.get_string("track-list") {
            None => Ok(Vec::new()),
            Some(json) => serde_json::from_str(&json).map_err(|e| Error::Decode(format!("{e}: {json}"))),
        }
    }

    /// Selects an audio track by id, or turns audio off with `None`.
    pub fn select_audio(&self, id: Option<i64>) -> Result<()> {
        self.mpv.set_property("aid", &id.map_or("no".into(), |i| i.to_string()))
    }

    pub fn select_subtitle(&self, id: Option<i64>) -> Result<()> {
        self.mpv.set_property("sid", &id.map_or("no".into(), |i| i.to_string()))
    }

    /// Read-only access to a property, for diagnostics (`hwdec-current`,
    /// `video-format`, `audio-codec-name`...). There is no setter.
    pub fn property(&self, name: &str) -> Option<String> {
        self.mpv.get_string(name)
    }

    /// Keeps the picture inside a rectangle of the window, as fractions of the
    /// window size taken off each side (0.0 to 0.95). With the video drawn in
    /// the whole window under a transparent web view, this is how the page
    /// reserves the area where the video shows.
    pub fn set_video_margins(&self, left: f64, right: f64, top: f64, bottom: f64) -> Result<()> {
        let clamp = |v: f64| if v.is_finite() { v.clamp(0.0, 0.95) } else { 0.0 };
        for (side, value) in [("left", left), ("right", right), ("top", top), ("bottom", bottom)] {
            self.mpv.set_property(&format!("video-margin-ratio-{side}"), &format!("{:.5}", clamp(value)))?;
        }
        Ok(())
    }

    /// Currently selected track id of a kind (`aid`, `sid`, `vid`).
    pub fn selected(&self, property: &str) -> Option<i64> {
        self.mpv.get_string(property).and_then(|s| s.parse().ok())
    }

    /// Names of the codecs this libmpv can decode (from `decoder-list`).
    pub fn decoders(&self) -> Result<Vec<String>> {
        #[derive(Deserialize)]
        struct D {
            codec: String,
        }
        let json = self.mpv.get_string("decoder-list").ok_or_else(|| Error::Decode("no decoder-list".into()))?;
        let list: Vec<D> = serde_json::from_str(&json).map_err(|e| Error::Decode(e.to_string()))?;
        Ok(list.into_iter().map(|d| d.codec).collect())
    }

    /// Waits up to `timeout_secs` for the next event and keeps the recent
    /// log lines, which carry the reason of a failed load.
    pub fn next_event(&self, timeout_secs: f64) -> Event {
        let event = self.mpv.wait_event(timeout_secs);
        if let Event::Log { level, prefix, text } = &event {
            let mut logs = self.logs.lock().unwrap_or_else(|e| e.into_inner());
            if logs.len() == LOG_LINES_KEPT {
                logs.pop_front();
            }
            logs.push_back(format!("[{level}] {prefix}: {text}"));
        }
        event
    }

    /// The HTTP status behind the latest failed network request, read from
    /// ffmpeg's log ("HTTP error 403 Forbidden").
    pub fn last_http_status(&self) -> Option<u16> {
        let logs = self.logs.lock().unwrap_or_else(|e| e.into_inner());
        logs.iter().rev().find_map(|line| {
            let rest = &line[line.find("HTTP error ")? + "HTTP error ".len()..];
            let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
            digits.parse().ok()
        })
    }

    pub fn recent_logs(&self) -> Vec<String> {
        self.logs.lock().unwrap_or_else(|e| e.into_inner()).iter().cloned().collect()
    }
}

// ------------------------------------------------------------- redaction --

/// Removes what identifies an account from text meant to be shown or shared:
/// for every http(s) URL, the credentials, the path and the query are dropped
/// and only the scheme and host (with port) stay. Xtream stream URLs carry the
/// username and password in the path, and mpv logs them ("Opening 'http://...'").
pub fn redact_urls(text: &str) -> String {
    let lower = text.to_ascii_lowercase();
    let mut out = String::with_capacity(text.len());
    let mut at = 0;
    while at < text.len() {
        let found = [lower[at..].find("http://"), lower[at..].find("https://")].into_iter().flatten().min();
        let Some(offset) = found else { break };
        let start = at + offset;
        out.push_str(&text[at..start]);
        let scheme_len = if lower[start..].starts_with("https://") { 8 } else { 7 };
        let end = text[start..]
            .find(|c: char| c.is_whitespace() || matches!(c, '"' | '\'' | ')' | '>' | ']' | ','))
            .map_or(text.len(), |i| start + i);
        let body = &text[start + scheme_len..end];
        let authority_end = body.find(['/', '?', '#']).unwrap_or(body.len());
        let host = body[..authority_end].rsplit('@').next().unwrap_or("");
        out.push_str(&text[start..start + scheme_len]);
        out.push_str(host);
        if authority_end < body.len() {
            out.push_str("/<redacted>");
        }
        at = end;
    }
    out.push_str(&text[at..]);
    out
}

#[cfg(test)]
mod tests {
    use super::redact_urls;

    #[test]
    fn drops_credentials_path_and_query_but_keeps_the_host() {
        assert_eq!(redact_urls("https://user:pass@host.example:8080/live/u/p/1.m3u8?token=abc"), "https://host.example:8080/<redacted>");
        assert_eq!(redact_urls("http://cf.example/movie/USER/PASS/123.mkv"), "http://cf.example/<redacted>");
    }

    #[test]
    fn works_inside_log_lines() {
        assert_eq!(redact_urls("Opening 'http://a.example/x/y.ts' for reading"), "Opening 'http://a.example/<redacted>' for reading");
        assert_eq!(redact_urls("redirect http://a.example/p?x=1, then (https://b.example/q) done"), "redirect http://a.example/<redacted>, then (https://b.example/<redacted>) done");
    }

    #[test]
    fn leaves_other_text_and_bare_hosts_alone() {
        assert_eq!(redact_urls("no url here"), "no url here");
        assert_eq!(redact_urls("http://host.example"), "http://host.example");
        assert_eq!(redact_urls("HTTP://Host.Example/Secret/Path"), "HTTP://Host.Example/<redacted>");
        assert_eq!(redact_urls(""), "");
    }
}
