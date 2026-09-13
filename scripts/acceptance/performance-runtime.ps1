param(
  [int[]]$TabCounts = @(10,50,100,200),
  [int[]]$DurationsMinutes = @(60,240),
  [int]$RemoteDebuggingPort = 9333
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
$exe = if ($env:SYNTH_AZECOTRON_PATH) { $env:SYNTH_AZECOTRON_PATH } else { Join-Path $root 'third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe' }
if (-not (Test-Path $exe)) { throw "Azecotron host missing: $exe" }

$outDir = Join-Path $root '.acceptance\performance'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$results = New-Object System.Collections.Generic.List[object]

function Wait-Cdp([int]$port,[int]$seconds=30) {
  $deadline=(Get-Date).AddSeconds($seconds)
  while((Get-Date)-lt $deadline){
    try { return Invoke-RestMethod "http://127.0.0.1:$port/json/version" -TimeoutSec 2 } catch { Start-Sleep -Milliseconds 500 }
  }
  throw "CDP endpoint did not become available on port $port."
}

function Open-Targets([int]$port,[int]$count) {
  for($i=0;$i -lt $count;$i++){
    try {
      Invoke-WebRequest -Method Put -Uri "http://127.0.0.1:$port/json/new?about:blank" -UseBasicParsing -TimeoutSec 5 | Out-Null
    } catch {
      try { Invoke-WebRequest -Method Get -Uri "http://127.0.0.1:$port/json/new?about:blank" -UseBasicParsing -TimeoutSec 5 | Out-Null }
      catch { throw "Could not create target $($i+1)/$count through CDP: $($_.Exception.Message)" }
    }
  }
}

function Measure-Scenario([int]$scenarioTabs, [int]$minutes) {
  $profile=Join-Path $outDir ("run-{0}-{1}" -f $scenarioTabs,$minutes)
  New-Item -ItemType Directory -Force -Path $profile | Out-Null
  $port=$RemoteDebuggingPort
  while(Test-NetConnection -ComputerName 127.0.0.1 -Port $port -InformationLevel Quiet){$port++}
  $proc=Start-Process -FilePath $exe -ArgumentList @(
    "--user-data-dir=$profile", '--no-first-run', '--synth-url=about:blank',
    '--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$port"
  ) -PassThru -WindowStyle Hidden
  try {
    $started=Get-Date
    $version=Wait-Cdp $port
    Open-Targets $port $scenarioTabs
    Start-Sleep -Seconds 5
    if($proc.HasExited){throw "Azecotron exited after creating targets: $($proc.ExitCode)"}
    $targets=@(Invoke-RestMethod "http://127.0.0.1:$port/json/list") | Where-Object {$_.type -eq 'page'}
    $p=Get-Process -Id $proc.Id
    if($targets.Count -ne ($scenarioTabs+1)){throw "Expected $($scenarioTabs+1) page targets including initial target, got $($targets.Count)."}
    $sample=[pscustomobject]@{
      timestamp=(Get-Date).ToUniversalTime().ToString('o');
      pid=$proc.Id;
      requested_tab_scenario=$scenarioTabs;
      actual_page_targets=$targets.Count;
      session_minutes=$minutes;
      cdp_browser=$version.Browser;
      private_working_set_bytes=[int64]$p.WorkingSet64;
      private_memory_bytes=[int64]$p.PrivateMemorySize64;
      total_processor_seconds=[double]$p.TotalProcessorTime.TotalSeconds;
      peak_working_set_bytes=[int64]$p.PeakWorkingSet64;
      startup_to_targets_seconds=[double]((Get-Date)-$started).TotalSeconds
    }
    $results.Add($sample)
    Write-Host ("scenario={0} targets={1} duration={2}m ws={3}MB cpu={4:n1}s" -f $scenarioTabs,$targets.Count,$minutes,($p.WorkingSet64/1MB),$p.TotalProcessorTime.TotalSeconds) -ForegroundColor Green
    if($minutes -gt 0){Start-Sleep -Seconds ($minutes*60)}
  } finally {
    if($proc -and -not $proc.HasExited){$proc.Kill();$proc.WaitForExit()}
  }
}

foreach($tabs in $TabCounts){ foreach($minutes in $DurationsMinutes){ Measure-Scenario $tabs $minutes } }
$csv=Join-Path $outDir 'performance-results.csv'; $results | Export-Csv -NoTypeInformation -Path $csv
$json=Join-Path $outDir 'performance-results.json'; $results | ConvertTo-Json -Depth 4 | Set-Content $json
Write-Host "Measured performance written to $csv" -ForegroundColor Green
Write-Host 'A scenario count is certified only when the CDP target count matches the requested number plus the initial target.'
