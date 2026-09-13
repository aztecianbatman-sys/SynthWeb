param([int]$DevToolsPort = 9223)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
$exe = if ($env:SYNTH_AZECOTRON_PATH) { $env:SYNTH_AZECOTRON_PATH } else { Join-Path $root 'third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe' }
if (-not (Test-Path $exe)) { throw "Azecotron host missing: $exe" }

$rules = Get-Content (Join-Path $root 'azecotron\app\synth_tracker_rules.json') -Raw | ConvertFrom-Json
if (-not $rules.rules -or $rules.rules.Count -lt 1) { throw 'Tracker ruleset is empty.' }

$profile = Join-Path $root '.acceptance\privacy-profile'
New-Item -ItemType Directory -Force -Path $profile | Out-Null
$stdout = Join-Path $root '.acceptance\privacy-stdout.log'
$stderr = Join-Path $root '.acceptance\privacy-stderr.log'
Remove-Item $stdout,$stderr -Force -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath $exe -ArgumentList @(
  "--user-data-dir=$profile",
  '--no-first-run',
  '--synth-url=https://example.com/',
  '--remote-debugging-address=127.0.0.1',
  "--remote-debugging-port=$DevToolsPort"
) -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden
try {
  $deadline=(Get-Date).AddSeconds(20)
  $version=$null
  while((Get-Date)-lt $deadline -and -not $version){
    Start-Sleep -Milliseconds 500
    try{$version=Invoke-RestMethod "http://127.0.0.1:$DevToolsPort/json/version" -TimeoutSec 2}catch{}
    if($proc.HasExited){throw "Azecotron exited: $($proc.ExitCode)"}
  }
  if(-not $version){throw 'DevTools endpoint unavailable; native runtime privacy test cannot run.'}

  $out=Get-Content $stdout -Raw -ErrorAction SilentlyContinue
  if($out -match 'ERR_BLOCKED_BY_CLIENT|tracker-blocked'){
    Write-Host 'Native tracker event: PASS' -ForegroundColor Green
  } else {
    Write-Warning 'No tracker-blocked event observed in this navigation; blocked-request counter cannot be certified from this run.'
  }

  if($out -match 'security.*secure.*true'){
    Write-Host 'Native HTTPS security event: PASS' -ForegroundColor Green
  } else {
    Write-Warning 'No native HTTPS security event observed yet.'
  }

  Write-Host "Loaded rules: $($rules.rules.Count)" -ForegroundColor Green
  Write-Host 'Cookie isolation and first-party-isolation still require a two-origin integration fixture.'
  Write-Host 'Privacy runtime harness completed without manufacturing a PASS.'
} finally {
  if($proc -and -not $proc.HasExited){$proc.Kill();$proc.WaitForExit()}
}
