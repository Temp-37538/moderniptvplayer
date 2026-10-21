//! Native playback command layer for the desktop application.
//!
//! This crate deliberately accepts only absolute HTTP(S) URLs. React should
//! receive a resolved playback URL from the authenticated application layer;
//! playlist credentials must not be logged or persisted by this crate.

use libmpv2::Mpv;
use url::Url;

pub struct NativePlayer {
    mpv: Mpv,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PlayerError {
    InvalidUrl,
    UnsupportedScheme,
    Mpv(String),
}

impl std::fmt::Display for PlayerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidUrl => write!(f, "The playback URL is invalid."),
            Self::UnsupportedScheme => write!(f, "Only HTTP and HTTPS streams are supported."),
            Self::Mpv(message) => write!(f, "Native playback failed: {message}"),
        }
    }
}

impl std::error::Error for PlayerError {}

impl NativePlayer {
    /// Creates an isolated libmpv instance.
    ///
    /// The host application must separately initialize the platform renderer
    /// before this player can display video in its window.
    pub fn new() -> Result<Self, PlayerError> {
        let mpv = Mpv::new().map_err(|error| PlayerError::Mpv(error.to_string()))?;
        let player = Self { mpv };
        player.set_volume(80.0)?;
        Ok(player)
    }

    /// Creates a Windows player embedded in the supplied native child window.
    /// The HWND must remain alive for the lifetime of this player.
    pub fn new_with_window(hwnd: isize) -> Result<Self, PlayerError> {
        if hwnd == 0 {
            return Err(PlayerError::Mpv(
                "The native video window handle is invalid.".into(),
            ));
        }
        let mpv = Mpv::with_initializer(|initializer| {
            initializer.set_option("wid", hwnd as i64)?;
            initializer.set_option("vo", "gpu")?;
            initializer.set_option("gpu-context", "win")?;
            Ok(())
        })
        .map_err(|error| PlayerError::Mpv(error.to_string()))?;
        Ok(Self { mpv })
    }

    /// Loads an absolute HTTP(S) stream URL without logging its contents.
    pub fn load(&self, source: &str) -> Result<(), PlayerError> {
        validate_source(source)?;
        self.mpv
            .command("loadfile", &[source, "replace"])
            .map_err(|error| PlayerError::Mpv(error.to_string()))
    }

    pub fn set_paused(&self, paused: bool) -> Result<(), PlayerError> {
        self.mpv
            .set_property("pause", paused)
            .map_err(|error| PlayerError::Mpv(error.to_string()))
    }

    pub fn set_volume(&self, volume: f64) -> Result<(), PlayerError> {
        if !volume.is_finite() {
            return Err(PlayerError::Mpv("Volume must be a finite number.".into()));
        }
        self.mpv
            .set_property("volume", volume.clamp(0.0, 100.0))
            .map_err(|error| PlayerError::Mpv(error.to_string()))
    }

    pub fn seek_absolute(&self, seconds: f64) -> Result<(), PlayerError> {
        if !seconds.is_finite() || seconds < 0.0 {
            return Err(PlayerError::Mpv(
                "Seek position must be a non-negative finite number.".into(),
            ));
        }
        let position = seconds.to_string();
        self.mpv
            .command("seek", &[&position, "absolute"])
            .map_err(|error| PlayerError::Mpv(error.to_string()))
    }

    pub fn stop(&self) -> Result<(), PlayerError> {
        self.mpv
            .command("stop", &[])
            .map_err(|error| PlayerError::Mpv(error.to_string()))
    }

    pub fn paused(&self) -> Result<bool, PlayerError> {
        self.mpv
            .get_property("pause")
            .map_err(|error| PlayerError::Mpv(error.to_string()))
    }

    pub fn position_seconds(&self) -> Result<f64, PlayerError> {
        self.mpv
            .get_property("time-pos")
            .map_err(|error| PlayerError::Mpv(error.to_string()))
    }

    pub fn duration_seconds(&self) -> Result<f64, PlayerError> {
        self.mpv
            .get_property("duration")
            .map_err(|error| PlayerError::Mpv(error.to_string()))
    }
}

fn validate_source(source: &str) -> Result<(), PlayerError> {
    let url = Url::parse(source).map_err(|_| PlayerError::InvalidUrl)?;
    match url.scheme() {
        "http" | "https" => Ok(()),
        _ => Err(PlayerError::UnsupportedScheme),
    }
}

#[cfg(test)]
mod tests {
    use super::{validate_source, PlayerError};

    #[test]
    fn accepts_http_and_https_sources() {
        assert_eq!(validate_source("http://example.com/live.ts"), Ok(()));
        assert_eq!(validate_source("https://example.com/live.m3u8"), Ok(()));
    }

    #[test]
    fn rejects_relative_and_non_http_sources() {
        assert_eq!(
            validate_source("/api/stream/live/playlist/channel?ext=m3u8"),
            Err(PlayerError::InvalidUrl)
        );
        assert_eq!(
            validate_source("file:///tmp/video.mkv"),
            Err(PlayerError::UnsupportedScheme)
        );
    }
}
