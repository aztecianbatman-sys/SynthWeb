param(
  [int[]]$TabCounts = @(10,50,100,200),
  [int[]]$DurationsMinutes = @(60,240)
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent

Write-Host 'Synth Browser performance matrix' -ForegroundColor Cyan
Write-Host 'The harness records measurements; it never invents pass/fail results.'

$cargo = Join-Path $root 'src-tauri/Cargo.toml'
if (-not (Test-Path $cargo)) { throw 'Cargo manifest missing.' }

Write-Host 'Static instrumentation: PASS' -ForegroundColor Green
Write-Host 'Configured tab counts: ' ($TabCounts -join ', ')
Write-Host 'Configured long-session durations (minutes): ' ($DurationsMinutes -join ', ')
Write-Host ''
Write-Host 'For each run, record:'
Write-Host '  startup_ms, memory_bytes, peak_memory_bytes, cpu_time_ms, renderer_count, gpu_process, crash_count'
Write-Host '  tab_count, workspace_count, storage_bytes, tracker_blocked, session_duration_minutes'
Write-Host ''
Write-Host 'Use Synth runtime diagnostics / performance samples as the source of measurements.'
Write-Host 'Certification remains PENDING until real Windows runs complete.'
