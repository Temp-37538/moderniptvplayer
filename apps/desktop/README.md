# Desktop application migration

The target is a desktop-only distribution with a React frontend and native playback. The browser player in `apps/web/src/components/video-player.tsx` uses `<video>`, hls.js and mpegts.js, so codec support is limited by the embedded WebView.

## Target architecture

- **React** owns player controls and visible playback state.
- **Tauri/Rust** owns the desktop lifecycle and native playback commands.
- **libmpv** handles demuxing, decoding, audio output and video rendering.
- The existing authenticated Next.js backend remains the source of account, playlist and stream data until those operations have a secure desktop-compatible API boundary.

## Implemented in this branch

- Rust/libmpv command layer with HTTP(S) source validation, volume control, seek, stop and playback properties.
- Tauri v2 shell and standalone React/Vite frontend.
- Windows native child-window surface: libmpv receives the HWND through `wid`; React tracks the player-stage rectangle and positions the native surface in physical pixels.
- React controls wired to Tauri commands, including play/pause, volume, seek-by-10-seconds and periodic playback-position updates.
- Windows build script pins an LGPL libmpv development archive, verifies its SHA-256, generates an MSVC import library and stages runtime DLLs for the installer.
- CI builds the React frontend, runs Linux Rust formatting/tests/Clippy, checks the Tauri shell on Linux and Windows, and attempts to build a Windows MSI installer.

## Current limitations

The Windows rendering integration is a first implementation and still needs a real playback smoke test on Windows. A successful compile or MSI build does not prove that video is visible or that every codec works.

The desktop frontend does **not** yet provide feature parity with the existing IPTV app. Secure desktop authentication/session handling, playlist CRUD/import, channel/movie/series browsing, favorites, watch-later/history, EPG, search and watch-progress integration still need to be ported to supported API endpoints. Do not expose stored provider credentials to React state, local storage or logs.

The current Next.js app is full-stack: pages call Prisma-backed server modules directly and stream routes depend on authenticated server sessions. It cannot simply be exported as a static Tauri frontend. Keep a trusted server-side boundary for account, playlist and stream resolution.

## Development and Windows build

From `apps/desktop`, install the standalone frontend dependencies and build it:

```sh
pnpm install --ignore-workspace --no-frozen-lockfile
pnpm build
```

On Windows, run PowerShell from an x64 Visual Studio Developer shell (with `dumpbin`, `lib` and 7-Zip available), then run:

```powershell
./scripts/setup-mpv-windows.ps1
pnpm tauri dev
```

To build the MSI installer:

```powershell
pnpm tauri build --bundles msi
```

The setup script downloads a pinned LGPL libmpv development archive and checks its SHA-256 before using it. The standalone frontend currently does not have a committed pnpm lockfile, so compatible dependency versions may resolve to newer releases until a lockfile is generated and committed.

## Validation

From `apps/desktop/native-player` on Linux, install Rust stable, `pkg-config` and `libmpv-dev` (Debian/Ubuntu: `sudo apt install pkg-config libmpv-dev`), then run:

```sh
cargo fmt --all -- --check
cargo test --all-targets
cargo clippy --all-targets -- -D warnings
```

The root CI dependency-audit job still reports pre-existing vulnerable dependencies, including Better Auth and transitive packages. That is separate from the desktop build failure and must be handled in a dedicated dependency-security change rather than hidden or downgraded.

## Status

This PR is an in-progress migration, not a completed desktop release. Keep it in draft until the Windows MSI build and playback smoke test succeed, desktop authentication/data flow is implemented, and the existing IPTV feature set has parity tests.
