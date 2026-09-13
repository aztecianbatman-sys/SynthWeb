$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent|Split-Path -Parent
$matrix=Get-Content (Join-Path $root 'scripts\acceptance\acceptance-matrix.json') -Raw|ConvertFrom-Json
$docs=Get-Content (Join-Path $root 'docs\source-completion.md') -Raw
$missing=@()
foreach($group in $matrix.must_pass_on_windows.PSObject.Properties){
 foreach($item in $group.Value){
  $token=($item -replace '[^A-Za-z0-9]+',' ').Trim()
  if($token.Length -lt 5){continue}
  $words=$token.Split(' ')|Where-Object {$_.Length -gt 4}
  $found=$false
  foreach($word in $words){if($docs -match [regex]::Escape($word)){ $found=$true; break }}
  if(-not $found){$missing+="$($group.Name): $item"}
 }
}
if($missing.Count){Write-Host 'Acceptance items not represented in source-completion contract:' -ForegroundColor Yellow;$missing|ForEach-Object{Write-Host $_};Write-Host 'This is informational; runtime acceptance still owns final verification.' -ForegroundColor Yellow}
else{Write-Host 'Acceptance matrix coverage in source-completion contract: PASS' -ForegroundColor Green}
