[CmdletBinding()]
param(
  [string]$ChromiumRoot = $(Join-Path (Split-Path $PSScriptRoot -Parent) 'third_party\azecotron-chromium\src'),
  [int]$MinimumFreeGB = 120
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Missing required command: $Name" }
  Write-Host ("{0}: available" -f $Name) -ForegroundColor Green
}

Write-Host 'Synth Browser Windows build preflight' -ForegroundColor Cyan
Write-Host "Repository: $root"

@('git','fetch','gclient','gn','autoninja','node','cargo','rustc','python','cl','link','rc') |
  ForEach-Object { Require-Command $_ }

[Environment]::SetEnvironmentVariable('DEPOT_TOOLS_WIN_TOOLCHAIN','0','Process')
$env:DEPOT_TOOLS_WIN_TOOLCHAIN='0'
git config --global core.longpaths true

$vswhere = Join-Path ([Environment]::GetEnvironmentVariable('ProgramFiles(x86)')) 'Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path $vswhere)) {
  $vswhere = Join-Path ([Environment]::GetEnvironmentVariable('ProgramFiles')) 'Microsoft Visual Studio\Installer\vswhere.exe'
}
if (-not (Test-Path $vswhere)) { throw 'Visual Studio vswhere.exe not found.' }

$installation = (& $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1).Trim()
if (-not $installation) { throw 'MSVC C++ build tools are not installed.' }

$vcvars = Join-Path $installation 'VC\Auxiliary\Build\vcvars64.bat'
if (-not (Test-Path $vcvars)) { throw "MSVC vcvars64.bat missing: $vcvars" }

if (-not (Get-Command cl -ErrorAction SilentlyContinue)) { throw 'cl.exe is not on PATH.' }
if (-not (Get-Command link -ErrorAction SilentlyContinue)) { throw 'link.exe is not on PATH.' }
if (-not (Get-Command rc -ErrorAction SilentlyContinue)) { throw 'rc.exe is not on PATH.' }

$driveName = (Get-Item $root).PSDrive.Name
$disk = Get-PSDrive -Name $driveName
$freeGB = [math]::Round($disk.Free / 1GB, 1)
Write-Host "Free disk space: $freeGB GB"
if ($freeGB -lt $MinimumFreeGB) {
  throw "At least $MinimumFreeGB GB free disk space is recommended before a Chromium checkout/build."
}

$expectedRevision = 'e6333471674f4d3af9f386bfc2e5e4388333b734'
if (Test-Path $ChromiumRoot) {
  $revisionFile = Join-Path $ChromiumRoot 'REVISION'
  if (Test-Path $revisionFile) {
    $actual = (Get-Content $revisionFile -Raw).Trim()
    if ($actual -ne $expectedRevision) {
      throw "Chromium checkout revision mismatch. Expected $expectedRevision, found $actual."
    }
    Write-Host 'Chromium revision pin: PASS' -ForegroundColor Green
  } else {
    Write-Host 'Chromium checkout exists but REVISION is missing; bootstrap will validate and repair it.' -ForegroundColor Yellow
  }
} else {
  Write-Host 'Chromium checkout not present yet; bootstrap will create and pin it.' -ForegroundColor Yellow
}

if ($root.Length -ge 80) {
  Write-Warning 'Long repository paths can slow or break Chromium builds. A short checkout path is strongly recommended.'
}

Write-Host 'MSVC/Windows SDK preflight: PASS' -ForegroundColor Green
Write-Host 'Preflight complete. Next: scripts\acceptance\run-full-windows.ps1' -ForegroundColor Green
