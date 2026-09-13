@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0.."
set "FAILED=0"

echo === SynthWeb source acceptance audit ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Node.js is required for frontend syntax validation.
  set "FAILED=1"
) else (
  node --check "%ROOT%\frontend\main.js"
  if errorlevel 1 (
    echo [FAIL] frontend\main.js syntax
    set "FAILED=1"
  ) else echo [PASS] frontend\main.js syntax
)

if not exist "%ROOT%\frontend\index.html" (echo [FAIL] frontend\index.html&set "FAILED=1") else echo [PASS] frontend\index.html
if not exist "%ROOT%\frontend\styles.css" (echo [FAIL] frontend\styles.css&set "FAILED=1") else echo [PASS] frontend\styles.css

powershell -NoProfile -Command ^
  "$root='%ROOT%';" ^
  "$app=Join-Path $root 'azecotron\app';" ^
  "$files=Get-ChildItem $app -Recurse -File -Include *.cc,*.h,*.gn;" ^
  "if($files | Select-String -Pattern 'content/shell'){Write-Host '[FAIL] Content Shell dependency remains under azecotron/app';exit 1}else{Write-Host '[PASS] No Content Shell dependency'};" ^
  "$required=@('synth_content_main_delegate.cc','synth_content_browser_client.cc','synth_browser_main_parts.cc','synth_browser_context.cc','synth_tracker_throttle.cc','synth_download_manager_delegate.cc','synth_permission_controller_delegate.cc','synth_devtools_manager_delegate.cc');" ^
  "$missing=$required | Where-Object {-not(Test-Path (Join-Path $app $_))};" ^
  "if($missing){Write-Host ('[FAIL] Missing native source: '+($missing -join ', '));exit 2}else{Write-Host '[PASS] Native service source set'}"
if errorlevel 1 set "FAILED=1"

for %%F in (
  "src-tauri\src\azecotron_bridge.rs"
  "src-tauri\src\native_host.rs"
  "scripts\bootstrap-azecotron.cmd"
  "scripts\build-azecotron.cmd"
  "scripts\install-azecotron-host.cmd"
  "scripts\build-azecotron-host.cmd"
  "scripts\verify-azecotron-production-boundary.cmd"
  "azecotron\app\synth_tracker_rules.json"
) do (
  if not exist "%ROOT%\%%~F" (
    echo [FAIL] Missing %%~F
    set "FAILED=1"
  ) else echo [PASS] %%~F
)

echo.
if "%FAILED%"=="0" (
  echo SOURCE ACCEPTANCE: PASS
  exit /b 0
)
echo SOURCE ACCEPTANCE: FAIL
exit /b 1
