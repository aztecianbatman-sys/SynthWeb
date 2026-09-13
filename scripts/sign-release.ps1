param(
 [Parameter(Mandatory=$true)][string]$CertificateThumbprint,
 [string]$TimestampUrl="http://timestamp.digicert.com",
 [string]$ReleaseDir=""
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if(-not $ReleaseDir){$ReleaseDir=Join-Path $root 'release'}
if(-not(Test-Path $ReleaseDir)){throw "Release directory missing: $ReleaseDir"}
$signtool=Get-Command signtool.exe -ErrorAction SilentlyContinue
if(-not $signtool){throw 'signtool.exe not found. Run from a Visual Studio Developer Command Prompt.'}
$cert=Get-ChildItem Cert:\CurrentUser\My\$CertificateThumbprint -ErrorAction SilentlyContinue|Select-Object -First 1
if(-not $cert){throw "Signing certificate not found: $CertificateThumbprint"}
foreach($item in (Get-ChildItem $ReleaseDir -File | Where-Object {$_.Extension -in '.exe','.msi'})){
 & $signtool.Source sign /sha1 $CertificateThumbprint /fd SHA256 /tr $TimestampUrl /td SHA256 $item.FullName
 if($LASTEXITCODE-ne0){throw "Signing failed: $($item.Name)"}
 & $signtool.Source verify /pa /all $item.FullName
 if($LASTEXITCODE-ne0){throw "Signature verification failed: $($item.Name)"}
}
Write-Host 'Code signing and signature verification: PASS' -ForegroundColor Green
