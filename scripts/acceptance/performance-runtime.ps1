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

function Measure-Run([int]$tabs, [int]$minutes) {
  $profile=Join-Path $outDir ("run-{0}-{1}" -f $tabs,$minutes)
  New-Item -ItemType Directory -Force -Path $profile | Out-Null
  $proc=Start-Process -FilePath $exe -ArgumentList @(
    "--user-data-dir=$profile",
    '--no-first-run',
    '--synth-url=about:blank',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0'
  ) -PassThru -WindowStyle Hidden
  try {
    Start-Sleep -Seconds 8
    if($proc.HasExited){throw "Azecotron exited early with code $($proc.ExitCode)"}
    $p=Get-Process -Id $proc.Id
    $sample=@{
      timestamp=(Get-Date).ToUniversalTime().ToString('o');
      pid=$proc.Id;
      requested_tabs=$tabs;
      session_minutes=$minutes;
      private_working_set_bytes=[int64]$p.WorkingSet64;
      private_memory_bytes=[int64]$p.PrivateMemorySize64;
      total_processor_seconds=[double]$p.TotalProcessorTime.TotalSeconds
      peak_working_set_bytes=[int64]$p.PeakWorkingSet64
    }
    $results.Add([pscustomobject]$sample)
    Write-Host ("tabs={0} duration={1}m ws={2}MB cpu={3:n1}s" -f $tabs,$minutes,($p.WorkingSet64/1MB),$p.TotalProcessorTime.TotalSeconds) -ForegroundColor Green
    if($minutes -gt 0){Start-Sleep -Seconds ($minutes*60)}
  } finally {
    if($proc -and -not $proc.HasExited){$proc.Kill();$proc.WaitForExit()}
  }
}

foreach($tabs in $TabCounts){ foreach($minutes in $DurationsMinutes){ Measure-Run $tabs $minutes } }
$csv=Join-Path $outDir 'performance-results.csv'
$results | Export-Csv -NoTypeInformation -Path $csv
$json=Join-Path $outDir 'performance-results.json'
$results | ConvertTo-Json -Depth 4 | Set-Content $json
Write-Host "Performance measurements written to $csv" -ForegroundColor Green
Write-Host 'This harness records measured process data; it does not claim browser-tab or GPU results that were not exercised.'
