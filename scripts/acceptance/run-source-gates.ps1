$ErrorActionPreference = 'Stop'
$gates = @('verify-source.ps1','privacy-regression.ps1','accessibility-audit.ps1','verify-matrix-coverage.ps1')
foreach ($gate in $gates) {
  Write-Host "`n=== $gate ===" -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot $gate)
  if ($LASTEXITCODE -ne 0) { throw "$gate failed." }
}
Write-Host "`nSOURCE GATES: PASS" -ForegroundColor Green
Write-Host 'Remaining acceptance work is runtime-dependent: Windows Chromium build, native process smoke tests, hardware/media/network verification, signing and packaging.'
