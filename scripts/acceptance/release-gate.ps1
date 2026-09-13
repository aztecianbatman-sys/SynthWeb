$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent

Write-Host 'Synth Browser release gate' -ForegroundColor Cyan

$required = @(
  'README.md',
  'docs/status.md',
  'docs/chromium-runtime.md',
  'docs/source-completion.md',
  'src-tauri/Cargo.toml',
  'src-tauri/tauri.conf.json',
  'scripts/bootstrap-azecotron.cmd',
  'scripts/build-azecotron-host.cmd',
  'scripts/install-azecotron-host.cmd',
  'src-tauri/src/updater.rs'
)
foreach ($path in $required) {
  if (-not (Test-Path (Join-Path $root $path))) { throw "Release artifact missing: $path" }
}

$updater = Get-Content (Join-Path $root 'src-tauri/src/updater.rs') -Raw
if ($updater -notmatch 'Ed25519|VerifyingKey') { throw 'Signed update verification is missing.' }
if ($updater -notmatch 'sha256') { throw 'Update SHA-256 verification is missing.' }

$az = Get-Content (Join-Path $root 'docs/chromium-runtime.md') -Raw
if ($az -notmatch '152\.0\.7977\.119') { throw 'Pinned Chromium version is not documented.' }

$blocked = Get-Content (Join-Path $root 'docs/status.md') -Raw
if ($blocked -match 'Release acceptance: MET') { throw 'Release status must not be marked complete before Windows verification.' }

Write-Host 'Release source gate: PASS' -ForegroundColor Green
Write-Host 'Binary signing, installer, upgrade/uninstall, rollback and final Windows acceptance remain runtime gates.'
