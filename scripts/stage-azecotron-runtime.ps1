param(
  [string]$BuildDir = $(Join-Path (Split-Path $PSScriptRoot -Parent) 'third_party\azecotron-chromium\src\out\Azecotron'),
  [string]$Destination = $(Join-Path (Split-Path $PSScriptRoot -Parent) 'src-tauri\resources\azecotron')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $BuildDir)) { throw "Azecotron build directory not found: $BuildDir" }

if (Test-Path $Destination) {
  Remove-Item $Destination -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

$requiredFiles = @(
  'chrome.exe',
  'azecotron_host.exe'
)

foreach ($file in $requiredFiles) {
  $source = Join-Path $BuildDir $file
  if (-not (Test-Path $source)) { throw "Required Azecotron binary missing: $source" }
  Copy-Item $source (Join-Path $Destination $file) -Force
}

Get-ChildItem $BuildDir -File | Where-Object {
  $_.Extension -in '.dll','.pak','.bin','.dat' -or
  $_.Name -in @('icudtl.dat','vk_swiftshader.dll')
} | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $Destination $_.Name) -Force
}

foreach ($dirName in @('locales','resources','swiftshader')) {
  $sourceDir=Join-Path $BuildDir $dirName
  if (Test-Path $sourceDir) {
    Copy-Item $sourceDir (Join-Path $Destination $dirName) -Recurse -Force
  }
}

$hashes = Get-ChildItem $Destination -Recurse -File |
  Get-FileHash -Algorithm SHA256 |
  Select-Object Path, Hash

$manifest = [ordered]@{
  format = 'synth-azecotron-runtime-v1'
  chromium_version = '152.0.7977.119'
  chromium_revision = 'e6333471674f4d3af9f386bfc2e5e4388333b734'
  generated_at_utc = (Get-Date).ToUniversalTime().ToString('o')
  files = @($hashes | ForEach-Object {
    [ordered]@{
      path = $_.Path.Substring($Destination.Length + 1)
      sha256 = $_.Hash
    }
  })
}

$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $Destination 'runtime-manifest.json') -Encoding UTF8

Write-Host "Azecotron runtime staged at $Destination" -ForegroundColor Green
Write-Host "Files: $($hashes.Count)" -ForegroundColor Green
