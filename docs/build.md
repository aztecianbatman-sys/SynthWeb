# Build

Windows development requires Rust with the MSVC toolchain, Microsoft C++ Build Tools, and WebView2. Tauri uses WebView2 for Windows web content.

From src-tauri:
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo tauri dev
cargo tauri build

The CI workflow installs Tauri CLI 2.11.5 and creates Windows release artifacts.
