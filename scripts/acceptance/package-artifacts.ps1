param([string]$ReleaseDir="")
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent|Split-Path -Parent
if(-not $ReleaseDir){$ReleaseDir=Join-Path $root 'release'}
if(-not(Test-Path $ReleaseDir)){throw "Release directory missing: $ReleaseDir"}
$artifacts=Get-ChildItem $ReleaseDir -File | Where-Object {$_.Extension -in '.exe','.msi'}
if(-not $artifacts){throw 'No installer artifacts found in release/.'}
$result=@()
foreach($item in $artifacts){
 $result += [ordered]@{file=$item.Name;bytes=$item.Length;sha256=(Get-FileHash $item.FullName -Algorithm SHA256).Hash}
 Write-Host "$($item.Name) SHA256=$($result[-1].sha256)" -ForegroundColor Green
}
$result | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $ReleaseDir 'artifact-manifest.json')
Write-Host 'Installer artifact manifest: PASS' -ForegroundColor Green
Write-Host 'Machine installation lifecycle must be executed on the dedicated Windows acceptance host.'
