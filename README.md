# Synth Browser

Synth Browser is a Rust + Tauri desktop browser project.

## Runtime truth

The native shell is Rust + Tauri. The current Windows browsing runtime is Tauri's WebView2-backed webview; Azecotron Web is a separate Chromium-fork milestone and is not falsely claimed as the runtime.

## Search

Cortis is the branded search layer. In v0.1, free-text searches are delegated to the real Google web-search URL. This is provider delegation, not copied Google source and not a fictional private search index.

## Build

Install Rust with the MSVC toolchain, Microsoft C++ Build Tools, WebView2, and Tauri CLI 2.11.5.

From src-tauri:
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo tauri dev
cargo tauri build

See docs/status.md for the exact feature state and remaining blockers.
