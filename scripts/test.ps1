$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot/../src-tauri"
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
Write-Host "Rust checks passed."
