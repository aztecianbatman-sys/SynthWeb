param(
  [switch]$SkipChromiumBuild,
  [switch]$SkipHostBuild,
  [string]$Configuration = "Azecotron",
  [switch]$KeepPreviousResources
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Step([string]$name,[scriptblock]$action) {
  Write-Host ("=== " + $name + " ===") -ForegroundColor Cyan
  & $action
  if ($LASTEXITCODE -ne 0) { throw ($name + " failed with exit code " + $LASTEXITCODE + ".") }
}

$src = Join-Path $root "third_party\azecotron-chromium\src"
$out = Join-Path $src ("out\" + $Configuration)
$resource = Join-Path $root "src-tauri\resources\azecotron"

if (-not $SkipChromiumBuild) {
  Step "Build Chromium chrome.exe" { cmd /c "$root\scripts\build-azecotron.cmd" }
}
if (-not $SkipHostBuild) {
  Step "Build Azecotron native host" { cmd /c "$root\scripts\build-azecotron-host.cmd" }
}

if (-not (Test-Path $out)) { throw ("Azecotron output directory missing: " + $out) }

$hostExe = Join-Path $out "azecotron_host.exe"
$chromeExe = Join-Path $out "chrome.exe"
if (-not (Test-Path $hostExe)) { throw ("Missing native host: " + $hostExe) }
if (-not (Test-Path $chromeExe)) { throw ("Missing Chromium browser binary: " + $chromeExe) }

Step "Stage complete Azecotron runtime" {
  if ((Test-Path $resource) -and (-not $KeepPreviousResources)) {
    Remove-Item $resource -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $resource | Out-Null

  foreach ($name in @("azecotron_host.exe","chrome.exe")) {
    Copy-Item (Join-Path $out $name) (Join-Path $resource $name) -Force
  }

  foreach ($pattern in @("*.dll","*.pak","*.bin","icudtl.dat")) {
    Get-ChildItem $out -Filter $pattern -File -ErrorAction SilentlyContinue |
      Copy-Item -Destination $resource -Force
  }

  foreach ($folder in @("locales","resources","swiftshader")) {
    $sourceFolder = Join-Path $out $folder
    if (Test-Path $sourceFolder) {
      Copy-Item $sourceFolder (Join-Path $resource $folder) -Recurse -Force
    }
  }

  $files = @()
  Get-ChildItem $resource -Recurse -File | ForEach-Object {
    $files += [ordered]@{
      path = $_.FullName.Substring($resource.Length + 1)
      sha256 = (Get-FileHash -Algorithm SHA256 $_.FullName).Hash
      bytes = $_.Length
    }
  }

  $manifest = [ordered]@{
    product = "Synth Browser"
    runtime = "Azecotron Web"
    chromium_version = "152.0.7977.119"
    chromium_revision = "e6333471674f4d3af9f386bfc2e5e4388333b734"
    staged_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    files = $files
  }
  $manifest | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $resource "runtime-manifest.json")
}

Step "Rust checks" {
  cargo fmt --manifest-path "$root\src-tauri\Cargo.toml" -- --check
  cargo clippy --manifest-path "$root\src-tauri\Cargo.toml" --all-targets --all-features -- -D warnings
  cargo test --manifest-path "$root\src-tauri\Cargo.toml" --all-features
}

Step "Build NSIS and MSI installers" {
  cargo tauri build --manifest-path "$root\src-tauri\Cargo.toml"
}

$bundle = Join-Path $root "src-tauri\target\release\bundle"
$stable = Join-Path $root "release"
New-Item -ItemType Directory -Force -Path $stable | Out-Null

Get-ChildItem $bundle -Recurse -File -Include *.exe,*.msi |
  ForEach-Object { Copy-Item $_.FullName $stable -Force }

$outputs = @()
Get-ChildItem $stable -File -Include *.exe,*.msi | ForEach-Object {
  $outputs += [ordered]@{
    file = $_.Name
    sha256 = (Get-FileHash -Algorithm SHA256 $_.FullName).Hash
    bytes = $_.Length
  }
}

$installerManifest = [ordered]@{
  product = "Synth Browser"
  version = "0.1.0"
  built_at_utc = (Get-Date).ToUniversalTime().ToString("o")
  chromium = "152.0.7977.119"
  installers = $outputs
}
$installerManifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $stable "installer-manifest.json")

Write-Host ("Installer artifacts staged in " + $stable) -ForegroundColor Green
