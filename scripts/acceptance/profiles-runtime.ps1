$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent|Split-Path -Parent
$exe=if($env:SYNTH_AZECOTRON_PATH){$env:SYNTH_AZECOTRON_PATH}else{Join-Path $root 'third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe'}
if(-not(Test-Path $exe)){throw "Azecotron host missing: $exe"}
$out=Join-Path $root '.acceptance\profiles'
New-Item -ItemType Directory -Force -Path $out|Out-Null
function Wait-Cdp([int]$port){
 $d=(Get-Date).AddSeconds(25)
 while((Get-Date)-lt $d){try{return Invoke-RestMethod "http://127.0.0.1:$port/json/version" -TimeoutSec 2}catch{Start-Sleep -Milliseconds 500}}
 throw "CDP unavailable on port $port"
}
$pa=Start-Process -FilePath $exe -ArgumentList @("--user-data-dir=$(Join-Path $out 'A')",'--no-first-run','--synth-url=about:blank','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9511') -PassThru -WindowStyle Hidden
$pb=Start-Process -FilePath $exe -ArgumentList @("--user-data-dir=$(Join-Path $out 'B')",'--no-first-run','--synth-url=about:blank','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9512') -PassThru -WindowStyle Hidden
try{
 Wait-Cdp 9511|Out-Null;Wait-Cdp 9512|Out-Null
 $ta=@(Invoke-RestMethod 'http://127.0.0.1:9511/json/list')|Where-Object type -eq 'page'
 $tb=@(Invoke-RestMethod 'http://127.0.0.1:9512/json/list')|Where-Object type -eq 'page'
 if(-not $ta-or-not $tb){throw 'Profile page target missing.'}
 if((Join-Path $out 'A') -eq (Join-Path $out 'B')){throw 'Profile roots are identical.'}
 Write-Host 'Independent native profile processes: PASS' -ForegroundColor Green
 Write-Host 'Cookie/storage/permission/session cross-leak fixture remains a separate two-origin test.' -ForegroundColor Yellow
}finally{
 foreach($p in @($pa,$pb)){if($p-and-not $p.HasExited){$p.Kill();$p.WaitForExit()}}
}
