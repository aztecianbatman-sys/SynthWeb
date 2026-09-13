[CmdletBinding()]
param(
  [string]$ChromiumRoot = $(Join-Path (Split-Path $PSScriptRoot -Parent) 'third_party\azecotron-chromium\src'),
  [int]$MinimumFreeGB = 120
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Require-Command([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Missing required command: $Name" }
  Write-Host ("{0}: {1}" -f $Name, $cmd.Source) -ForegroundColor Green
}

Write-Host 'Synth Browser Windows build preflight' -ForegroundColor Cyan
Write-Host "Repository: $root"

Require-Command git
Require-Command fetch
Require-Command gclient
Require-Command gn
Require-Command autoninja
Require-Command node
Require-Command cargo
Require-Command rustc
Require-Command python

$pythonCommand = (Get-Command python).Source
if ($pythonCommand -notmatch 'depot_tools') {
  Write-Warning "The first python on PATH is not depot_tools' Python: $pythonCommand"
}

$env:DEPOT_TOOLS_WIN_TOOLCHAIN = '0'

$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path $vswhere)) {
  $vswhere = Join-Path ${env:ProgramFiles} 'Microsoft Visual Studio\Installer\vswhere.exe'
}
if (-not (Test-Path $vswhere)) { throw 'Visual Studio vswhere.exe not found.' }

$installation = (& $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1).Trim()
if (-not $installation) { throw 'MSVC C++ build tools are not installed.' }

$vcvars = Join-Path $installation 'VC\Auxiliary\Build\vcvars64.bat'
if (-not (Test-Path $vcvars)) { throw "MSVC vcvars64.bat missing: $vcvars" }

$envLines = & cmd.exe /s /c '"' + $vcvars + '" >nul && set'
foreach ($line in $envLines) {
  $pair = $line -split '=', 2
  if ($pair.Count -eq 2 -and $pair[0] -match '^[A-Za-z_][A-Za-z0-9_]*

git config --global core.longpaths true
$drive = (Get-Item $root).PSDrive.Name + ':'
$disk = Get-PSDrive -Name $drive.TrimEnd(':')
$freeGB = [math]::Round($disk.Free / 1GB, 1)
Write-Host "Free disk space: $freeGB GB"
if ($freeGB -lt $MinimumFreeGB) { throw "At least $MinimumFreeGB GB free disk space is recommended before Chromium checkout/build." }

if (Test-Path $ChromiumRoot) {
  $revision = Join-Path $ChromiumRoot 'REVISION'
  if (Test-Path $revision) {
    $text = Get-Content $revision -Raw
    $expected = 'e6333471674f4d3af9f386bfc2e5e4388333b734'
    if ($text -notmatch $expected) { throw 'Chromium checkout revision does not match the pinned SynthWeb revision.' }
    Write-Host 'Chromium revision pin: PASS' -ForegroundColor Green
  } else {
    Write-Host 'Chromium checkout exists but REVISION is missing; bootstrap will repair it.' -ForegroundColor Yellow
  }
} else {
  Write-Host 'Chromium checkout not present yet; bootstrap script will create it.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Preflight: PASS' -ForegroundColor Green
Write-Host 'Next command: scripts\acceptance\run-full-windows.ps1'
) {
    Set-Item -Path ('Env:' + $pair[0]) -Value $pair[1]
  }
}
Require-Command cl
Require-Command link
Require-Command rc
Write-Host 'MSVC/Windows SDK environment: PASS' -ForegroundColor Green

if (-not (Get-Command cl -ErrorAction SilentlyContinue)) {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
  if (-not (Test-Path $vswhere)) { throw 'Visual Studio / vswhere not found. Install Visual Studio with Desktop C++ workload.' }
  $installation = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  if (-not $installation) { throw 'MSVC C++ build tools are not installed.' }
  $vcvars = Join-Path $installation 'VC\Auxiliary\Build\vcvars64.bat'
  if (-not (Test-Path $vcvars)) { throw "MSVC vcvars64.bat missing: $vcvars" }
  Write-Host "MSVC installation: $installation" -ForegroundColor Green
} else {
  Write-Host 'MSVC compiler: cl.exe already on PATH' -ForegroundColor Green
}

git config --global core.longpaths true
$drive = (Get-Item $root).PSDrive.Name + ':'
$disk = Get-PSDrive -Name $drive.TrimEnd(':')
$freeGB = [math]::Round($disk.Free / 1GB, 1)
Write-Host "Free disk space: $freeGB GB"
if ($freeGB -lt $MinimumFreeGB) { throw "At least $MinimumFreeGB GB free disk space is recommended before Chromium checkout/build." }

if (Test-Path $ChromiumRoot) {
  $revision = Join-Path $ChromiumRoot 'REVISION'
  if (Test-Path $revision) {
    $text = Get-Content $revision -Raw
    $expected = 'e6333471674f4d3af9f386bfc2e5e4388333b734'
    if ($text -notmatch $expected) { throw 'Chromium checkout revision does not match the pinned SynthWeb revision.' }
    Write-Host 'Chromium revision pin: PASS' -ForegroundColor Green
  } else {
    Write-Host 'Chromium checkout exists but REVISION is missing; bootstrap will repair it.' -ForegroundColor Yellow
  }
} else {
  Write-Host 'Chromium checkout not present yet; bootstrap script will create it.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Preflight: PASS' -ForegroundColor Green
Write-Host 'Next command: scripts\acceptance\run-full-windows.ps1'
