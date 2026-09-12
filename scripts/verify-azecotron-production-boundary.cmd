@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."

powershell -NoProfile -Command ^
  "$hits = Get-ChildItem -Path '%ROOT%\azecotron\app' -Recurse -File -Include *.cc,*.h,*.gn | Select-String -Pattern 'content/shell'; if ($hits) { $hits | ForEach-Object { Write-Host ('ERROR: Content Shell dependency: ' + $_.Path + ':' + $_.LineNumber) }; exit 1 }; Write-Host 'Azecotron app has no Content Shell dependency.'"
if errorlevel 1 exit /b 1
exit /b 0
