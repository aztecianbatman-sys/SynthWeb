$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent

Write-Host 'Synth Browser accessibility source audit' -ForegroundColor Cyan

$html = Get-Content (Join-Path $root 'frontend/index.html') -Raw
$css  = Get-Content (Join-Path $root 'frontend/styles.css') -Raw
$js   = Get-Content (Join-Path $root 'frontend/main.js') -Raw

$checks = [ordered]@{
  'ARIA dialog/labels' = $html -match 'aria-(label|labelledby|modal)'
  'Keyboard command palette' = $js.Contains('Command Palette') -or $js.Contains('command palette')
  'Reduced motion support' = $css.Contains('prefers-reduced-motion')
  'Light theme' = $css.Contains('data-theme=light') -or $css.Contains('theme-light')
  'Responsive breakpoints' = $css.Contains('@media')
  'Visible focus styling' = $css -match '(:focus|focus-visible)'
  'No image-only primary navigation' = $html -match 'nav\.home|nav\.assist|nav\.shield'
}

$checks.GetEnumerator() | ForEach-Object {
  Write-Host ("{0}: {1}" -f $_.Key, ($(if ($_.Value) { 'PASS' } else { 'FAIL' }))) -ForegroundColor ($(if ($_.Value) { 'Green' } else { 'Red' }))
}

if (($checks.Values | Where-Object { -not $_ }).Count -gt 0) { throw 'Accessibility source regression detected.' }
Write-Host 'Source accessibility gate: PASS' -ForegroundColor Green
Write-Host 'Manual screen-reader, contrast, high-DPI, zoom and keyboard-only verification is still required.'
