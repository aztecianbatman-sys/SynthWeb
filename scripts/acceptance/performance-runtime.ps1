param(
  [int[]]$TabCounts = @(10,50,100,200),
  [int[]]$DurationsMinutes = @(1,5)
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
$exe = if ($env:SYNTH_AZECOTRON_PATH) { $env:SYNTH_AZECOTRON_PATH } else { Join-Path $root 'third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe' }
if (-not (Test-Path $exe)) { throw "Azecotron host missing: $exe" }

$outDir = Join-Path $root '.acceptance\performance'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$results = New-Object System.Collections.Generic.List[object]

function Measure-Scenario([int]$scenarioTabs, [int]$minutes) {
  $profile=Join-Path $outDir ("run-{0}-{1}" -f $scenarioTabs,$minutes)
  New-Item -ItemType Directory -Force -Path $profile | Out-Null
  $proc=Start-Process -FilePath $exe -ArgumentList @(
    "--user-data-dir=$profile", '--no-first-run', '--synth-url=about:blank'
  ) -PassThru -WindowStyle Hidden
  try {
    $started=Get-Date
    Start-Sleep -Seconds 8
    if($proc.HasExited){throw "Azecotron exited early with code $($proc.ExitCode)"}
    $p=Get-Process -Id $proc.Id
    $results.Add([pscustomobject]@{
      timestamp=(Get-Date).ToUniversalTime().ToString('o');
      pid=$proc.Id;
      requested_tab_scenario=$scenarioTabs;
      session_minutes=$minutes;
      actual_webcontents_verified=$false;
      private_working_set_bytes=[int64]$p.WorkingSet64;
      private_memory_bytes=[int64]$p.PrivateMemorySize64;
      total_processor_seconds=[double]$p.TotalProcessorTime.TotalSeconds;
      peak_working_set_bytes=[int64]$p.PeakWorkingSet64;
      startup_observation_seconds=[double]((Get-Date)-$started).TotalSeconds
    })
    Write-Host ("scenario={0} duration={1}m ws={2}MB cpu={3:n1}s" -f $scenarioTabs,$minutes,($p.WorkingSet64/1MB),$p.TotalProcessorTime.TotalSeconds) -ForegroundColor Green
    if($minutes -gt 0){Start-Sleep -Seconds ($minutes*60)}
  } finally {
    if($proc -and -not $proc.HasExited){$proc.Kill();$proc.WaitForExit()}
  }
}

foreach($tabs in $TabCounts){ foreach($minutes in $DurationsMinutes){ Measure-Scenario $tabs $minutes } }
$csv=Join-Path $outDir 'performance-results.csv'; $results | Export-Csv -NoTypeInformation -Path $csv
$json=Join-Path $outDir 'performance-results.json'; $results | ConvertTo-Json -Depth 4 | Set-Content $json
Write-Host "Measurements written to $csv" -ForegroundColor Green
Write-Host 'This runner records process-level observations only. requested_tab_scenario is not a claim that that many WebContents were opened.'
Write-Host 'Real 10/50/100/200 tab certification remains pending the native multi-tab driver.'
