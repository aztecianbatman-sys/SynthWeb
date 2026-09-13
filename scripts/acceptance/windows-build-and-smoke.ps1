$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
Set-Location $root

Write-Host '1/8 Source boundary' -ForegroundColor Cyan
& "$root\scripts\acceptance\verify-source.ps1"

Write-Host '2/8 Rust formatting' -ForegroundColor Cyan
cargo fmt --all -- --check

Write-Host '3/8 Rust lint' -ForegroundColor Cyan
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings

Write-Host '4/8 Rust tests' -ForegroundColor Cyan
cargo test --manifest-path src-tauri/Cargo.toml --all-features

Write-Host '5/8 Chromium bootstrap + native host build' -ForegroundColor Cyan
cmd /c scripts\build-azecotron-host.cmd
if ($LASTEXITCODE -ne 0) { throw 'Azecotron native host build failed.' }

Write-Host '6/8 Native runtime smoke' -ForegroundColor Cyan
$azecotron = if ($env:SYNTH_AZECOTRON_PATH) { $env:SYNTH_AZECOTRON_PATH } else { Join-Path $root 'third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe' }
if (-not (Test-Path $azecotron)) { throw "Azecotron executable missing: $azecotron" }
$process = Start-Process -FilePath $azecotron -ArgumentList '--synth-url=about:blank','--no-first-run' -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8
if ($process.HasExited) { throw "Azecotron exited during startup: code $($process.ExitCode)" }
$process.CloseMainWindow() | Out-Null
Start-Sleep -Seconds 2
if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit() }

Write-Host '7/8 Tauri package' -ForegroundColor Cyan
cargo tauri build
if ($LASTEXITCODE -ne 0) { throw 'Tauri packaging failed.' }

Write-Host '8/8 Acceptance complete' -ForegroundColor Green
Write-Host 'This script is the required Windows verification gate. Results are not inferred when the commands fail.'
