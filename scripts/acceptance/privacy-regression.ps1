$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent

Write-Host 'Synth Shield regression gate' -ForegroundColor Cyan

$source = Get-Content (Join-Path $root 'src-tauri/src/main.rs') -Raw
$checks = [ordered]@{
  'HTTPS-only default' = $source.Contains("('https_only','true')")
  'AI disabled default' = $source.Contains("('ai_enabled','false')")
  'autofill disabled default' = $source.Contains("('autofill','false')")
  'clipboard blocked' = $source.Contains("('permission_clipboard','deny')")
  'popup blocking policy' = $source.Contains("('permission_popups','deny')")
  'autoplay blocking policy' = $source.Contains("('permission_autoplay','deny')")
  'first-party isolation policy' = $source.Contains("('first_party_isolation','true')")
  'tracker throttle source' = Test-Path (Join-Path $root 'azecotron/app/synth_tracker_throttle.cc')
  'permission history' = $source.Contains('permission_history')
  'site data clearing' = $source.Contains('clear_current_site_data')
}

$checks.GetEnumerator() | ForEach-Object {
  Write-Host ("{0}: {1}" -f $_.Key, ($(if ($_.Value) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($_.Value) { 'Green' } else { 'Red' }))
}

if (($checks.Values | Where-Object { -not $_ }).Count -gt 0) { throw 'Privacy source regression detected.' }
Write-Host 'Privacy source gate: PASS' -ForegroundColor Green
Write-Host 'Native request interception, cookie isolation, and fingerprinting still require runtime tests.'
