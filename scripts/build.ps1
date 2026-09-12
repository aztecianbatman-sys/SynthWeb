$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot/../src-tauri"

cargo generate-lockfile
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo tauri build

Write-Host ""
Write-Host "Synth Browser build finished."
Write-Host "Check src-tauri/target/release/bundle for installers."
