param(
  [switch]$SkipChromiumBuild,
  [switch]$SkipPackage,
  [int[]]$TabCounts = @(10,50,100,200),
  [int[]]$DurationsMinutes = @(60,240)
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
Set-Location $root

function Run-Step([string]$Name, [scriptblock]$Action) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE." }
}

Run-Step 'Windows build preflight' { & "$root\scripts\setup-windows-build.ps1" }
Run-Step 'Source gates' { & "$root\scripts\acceptance\run-source-gates.ps1" }
Run-Step 'Native production boundary' { cmd /c "$root\scripts\verify-azecotron-production-boundary.cmd" }
Run-Step 'Rust format' { cargo fmt --all -- --check }
Run-Step 'Rust lint' { cargo clippy --manifest-path "$root\src-tauri\Cargo.toml" --all-targets --all-features -- -D warnings }
Run-Step 'Rust tests' { cargo test --manifest-path "$root\src-tauri\Cargo.toml" --all-features }

if (-not $SkipChromiumBuild) {
  Run-Step 'Azecotron Chromium build' { cmd /c "$root\scripts\build-azecotron.cmd" }
  Run-Step 'Azecotron native host build' { cmd /c "$root\scripts\build-azecotron-host.cmd" }
}

Run-Step 'Native runtime smoke' { & "$root\scripts\acceptance\native-runtime-smoke.ps1" }
Run-Step 'Privacy integration' { & "$root\scripts\acceptance\privacy-runtime.ps1" }
Run-Step 'Profiles isolation' { & "$root\scripts\acceptance\profiles-runtime.ps1" }
Run-Step 'DevTools integration' { & "$root\scripts\acceptance\devtools-runtime.ps1" }
Run-Step 'Media/WebRTC integration' { & "$root\scripts\acceptance\media-runtime.ps1" }
Run-Step 'Performance collection' { & "$root\scripts\acceptance\performance-runtime.ps1" -TabCounts $TabCounts -DurationsMinutes $DurationsMinutes }

if (-not $SkipPackage) {
  Run-Step 'Stage Azecotron and build installers' { & "$root\scripts\build-installer.ps1" -SkipChromiumBuild -SkipHostBuild }
  Run-Step 'Release gate' { & "$root\scripts\acceptance\release-gate.ps1" }
  Run-Step 'Package artifact manifest' { & "$root\scripts\acceptance\package-artifacts.ps1" }
  if ($env:SYNTH_SIGNING_CERT_THUMBPRINT) {
    Run-Step 'Authenticode signing' { & "$root\scripts\sign-release.ps1" -CertificateThumbprint $env:SYNTH_SIGNING_CERT_THUMBPRINT }
  }
}

Write-Host "`nFULL WINDOWS ACCEPTANCE: PASS" -ForegroundColor Green
Write-Host 'A PASS is valid only when every step above completed successfully.'
