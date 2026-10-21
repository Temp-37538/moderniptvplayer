# Desktop application migration

The target is a desktop-only distribution with the existing React experience and a native playback engine. The browser player in `apps/web/src/components/video-player.tsx` uses `<video>`, hls.js, and mpegts.js; codec support is therefore limited by the embedded WebView.

## Target architecture

- **React** owns player controls and visible playback state.
- **Tauri/Rust** owns desktop lifecycle and native playback commands.
- **libmpv** handles stream demuxing, decoding, audio output, and video rendering.
- The existing authenticated application/backend remains the source of playlist and account data during the migration until its server-side operations have a secure API boundary.

## Security and migration constraints

The current Next.js app is full-stack: pages call Prisma-backed server modules directly, and stream routes depend on authenticated server sessions. It cannot simply be exported as a static Tauri frontend. Account, playlist and stream resolution must retain a trusted server-side boundary; stored playlist credentials must not be copied into UI state or logged by the native player.

A libmpv command wrapper is not, by itself, a video renderer. The Tauri window still needs a platform-specific native rendering surface, lifecycle coordination and packaged libmpv runtime libraries. Do not treat a successful command call as proof that video is visible or that playback works end to end.

## Implemented in this branch

- Initial Rust libmpv command wrapper with HTTP(S) URL validation and unit tests.
- Tauri v2 application shell and React/Vite control surface.
- Tauri invoke handlers for loading a stream, play/pause, volume, stop and status.
- Separate desktop frontend workspace so its dependencies do not invalidate the existing web application's frozen pnpm lockfile.

The React screen explicitly reports that the native rendering surface is not yet connected. The current code is scaffolding and must not be considered a usable replacement for the web app.

To install and build the standalone frontend manually, run from `apps/desktop`:

```sh
pnpm install --ignore-workspace --no-frozen-lockfile
pnpm build
pnpm tauri dev
```

Tauri's configured dev/build hooks also install the standalone frontend dependencies. The desktop frontend currently does not have a committed standalone lockfile, so dependency versions may resolve to newer compatible releases until one is generated and committed.

## Remaining work before this can be called functional

1. Integrate and validate libmpv's native render API with the Tauri window on Windows, including resize, teardown and device/window lifecycle.
2. Add playback events (loading, buffering, playing, ended, errors) and periodic position updates; avoid polling native properties in a way that blocks the UI.
3. Implement secure authenticated account/playlist/stream resolution for the desktop target. Never put provider credentials in logs or frontend persistence.
4. Port the existing React navigation and IPTV features (live TV, VOD, series, favorites, history/resume, search and EPG) to the desktop frontend or a supported API, with parity tests.
5. Produce a Windows installer that includes compatible libmpv runtime dependencies; verify clean-machine install and playback. Then add Linux/macOS targets if desired.

## Validation

The `Desktop native player` GitHub Actions workflow checks the frontend build, runs Rust formatting/unit tests/Clippy on Linux, and runs a Windows-target compile check for the native crate. A Windows-target `cargo check` alone does not prove that the DLL/import library is packaged or that video renders.

For a local Linux run, install Rust stable, `pkg-config`, and the libmpv development package (Debian/Ubuntu: `sudo apt install pkg-config libmpv-dev`). From `apps/desktop/native-player`, run:

```sh
cargo fmt --all -- --check
cargo test --all-targets
cargo clippy --all-targets -- -D warnings
```

## Status

This is an in-progress migration branch, not a finished desktop release. Do not merge or advertise it as functional until the native rendering, authentication/data flow, feature parity, packaging and end-to-end tests above are complete.
