# Desktop application migration

The target is a desktop-only distribution with the existing React experience and a native playback engine. The browser player in `apps/web/src/components/video-player.tsx` uses `<video>`, hls.js, and mpegts.js; its codec support is therefore limited by the embedded WebView.

## Target architecture

- **React** owns the player controls and playback state shown in the UI.
- **Tauri/Rust** owns native playback commands and lifecycle.
- **libmpv** handles stream demuxing, decoding, audio output, and video rendering.
- The existing authenticated application/backend remains the source of playlist and account data during the first migration phase.

## Migration constraints

The current Next.js app is full-stack: pages call Prisma-backed server modules directly, and stream routes depend on the authenticated server session. It cannot simply be exported as a static Tauri frontend. The desktop target must keep a server-side boundary for account/data operations or first move those operations behind an API. Playlist credentials must not be copied into frontend state or logged by the native player.

The native renderer also needs a real platform-specific rendering surface; invoking libmpv commands alone does not embed video into a React element. Rendering integration is intentionally a separate step from the playback command layer.

## Phases

1. Establish the native playback command layer and its input validation.
2. Add the Tauri shell and connect React controls to typed Tauri commands/events.
3. Embed libmpv rendering in the desktop window and report playback properties to React.
4. Adapt stream URL resolution and authenticated playback without exposing stored playlist credentials.
5. Package and test Windows first, then add Linux/macOS targets and their libmpv dependencies.

This directory is the initial desktop migration foundation; it does not yet replace the web player or provide a packaged desktop application.

## Validation

The native-player crate is checked by the `Desktop native player` GitHub Actions workflow:

- Linux installs `libmpv-dev`, then runs `cargo fmt --check`, `cargo test`, and Clippy with warnings denied.
- Windows runs `cargo check --target x86_64-pc-windows-msvc` to check Rust compilation for the Windows ABI. This does not link or package the native mpv runtime.

For a local Linux run, install Rust stable, `pkg-config`, and the libmpv development package (on Debian/Ubuntu: `sudo apt install pkg-config libmpv-dev`). Then run these commands from `apps/desktop/native-player`:

```sh
cargo fmt --all -- --check
cargo test --all-targets
cargo clippy --all-targets -- -D warnings
```

## Current milestone status

This PR is still an implementation foundation, not a finished desktop release. There is not yet a Tauri application shell, native video surface, React-to-player adapter, desktop authentication/session strategy, or packaged Windows installer. Those pieces must be implemented and tested before the existing IPTV application can be considered migrated.
