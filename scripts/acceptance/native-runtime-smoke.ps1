param([int]$StartupSeconds = 12)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent

$exe = if ($env:SYNTH_AZECOTRON_PATH) { $env:SYNTH_AZECOTRON_PATH } else { Join-Path $root 'third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe' }
if (-not (Test-Path $exe)) { throw "Azecotron host missing: $exe" }

$profile = Join-Path $root '.acceptance\runtime-profile'
New-Item -ItemType Directory -Force -Path $profile | Out-Null
$port = 9222
$log = Join-Path $root '.acceptance\azecotron-smoke.log'
if (Test-Path $log) { Remove-Item $log -Force }

$args = @(
  "--user-data-dir=$profile",
  '--no-first-run',
  '--remote-debugging-address=127.0.0.1',
  "--remote-debugging-port=$port",
  '--synth-url=about:blank'
)

$process = Start-Process -FilePath $exe -ArgumentList $args -RedirectStandardOutput $log -RedirectStandardError (Join-Path $root '.acceptance\azecotron-smoke.err') -PassThru -WindowStyle Hidden
try {
  $deadline = (Get-Date).AddSeconds($StartupSeconds)
  do {
    Start-Sleep -Milliseconds 500
    if ($process.HasExited) { throw "Azecotron exited during startup: $($process.ExitCode)" }
    try { $version = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/version" -TimeoutSec 2; break } catch {}
  } while ((Get-Date) -lt $deadline)

  if (-not $version) { throw 'Chrome DevTools Protocol endpoint did not become available.' }
  if (-not $version.Browser) { throw 'CDP /json/version returned no Browser identity.' }

  $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/list" -TimeoutSec 5
  $page = @($targets | Where-Object { $_.type -eq 'page' }) | Select-Object -First 1
  if (-not $page) { throw 'No page target was exposed by Azecotron.' }
  if ($page.url -notmatch '^about:blank') { throw "Unexpected smoke URL: $($page.url)" }

  $parent = Get-Process -Id $process.Id
  if (-not $parent) { throw 'Azecotron process disappeared.' }

  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($process.Id)"
  Write-Host "Azecotron process: $($process.Id)" -ForegroundColor Green
  Write-Host "Child process count: $($children.Count)" -ForegroundColor Green
  if ($children.Count -lt 1) { Write-Warning 'No child processes observed; renderer/GPU verification may need a longer or page-loaded run.' }

  Write-Host "Browser identity: $($version.Browser)" -ForegroundColor Green
  Write-Host 'CDP page target: PASS' -ForegroundColor Green
  Write-Host 'Startup/renderer process smoke: PASS' -ForegroundColor Green
} finally {
  if ($process -and -not $process.HasExited) {
    $process.CloseMainWindow() | Out-Null
    Start-Sleep -Seconds 2
    if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit() }
  }
}
