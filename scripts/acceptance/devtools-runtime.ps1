param([int]$Port=9522)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent|Split-Path -Parent
$exe=if($env:SYNTH_AZECOTRON_PATH){$env:SYNTH_AZECOTRON_PATH}else{Join-Path $root 'third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe'}
if(-not(Test-Path $exe)){throw "Azecotron host missing: $exe"}
$profile=Join-Path $root '.acceptance\devtools'
New-Item -ItemType Directory -Force -Path $profile|Out-Null
$p=Start-Process -FilePath $exe -ArgumentList @("--user-data-dir=$profile",'--no-first-run','--synth-url=https://example.com/','--remote-debugging-address=127.0.0.1',"--remote-debugging-port=$Port") -PassThru -WindowStyle Hidden
try{
 $d=(Get-Date).AddSeconds(25);$version=$null
 while((Get-Date)-lt $d-and-not $version){Start-Sleep -Milliseconds 500;try{$version=Invoke-RestMethod "http://127.0.0.1:$Port/json/version" -TimeoutSec 2}catch{};if($p.HasExited){throw "Azecotron exited: $($p.ExitCode)"}}
 if(-not $version){throw 'CDP endpoint unavailable.'}
 $targets=@(Invoke-RestMethod "http://127.0.0.1:$Port/json/list")
 $page=$targets|Where-Object type -eq 'page'|Select-Object -First 1
 if(-not $page){throw 'No page target.'}
 if(-not $page.webSocketDebuggerUrl){throw 'Page target has no webSocketDebuggerUrl.'}
 Write-Host "DevTools browser: $($version.Browser)" -ForegroundColor Green
 Write-Host 'CDP target discovery: PASS' -ForegroundColor Green
 Write-Host 'DevToolsAgentHost/Elements/Console/Network/Sources/Application/dock-detach require native Chromium manual verification.' -ForegroundColor Yellow
}finally{if($p-and-not $p.HasExited){$p.Kill();$p.WaitForExit()}}
