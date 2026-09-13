@echo off
setlocal
set "ROOT=%~dp0.."

echo === Frontend syntax ===
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is required for frontend checks.
  exit /b 1
)
node --check "%ROOT%\frontend\main.js"
if errorlevel 1 exit /b 1

echo === Azecotron production boundary ===
call "%ROOT%\scripts\verify-azecotron-production-boundary.cmd"
if errorlevel 1 exit /b 1

echo === Required source files ===
for %%F in (
  "%ROOT%\frontend\index.html"
  "%ROOT%\frontend\styles.css"
  "%ROOT%\frontend\main.js"
  "%ROOT%\src-tauri\src\main.rs"
  "%ROOT%\azecotron\app\azecotron_app_main.cc"
  "%ROOT%\azecotron\app\synth_content_main_delegate.cc"
  "%ROOT%\azecotron\app\synth_content_browser_client.cc"
  "%ROOT%\azecotron\app\synth_browser_main_parts.cc"
  "%ROOT%\azecotron\app\synth_browser_context.cc"
  "%ROOT%\azecotron\host\azecotron_runtime_host.cc"
) do (
  if not exist "%%~F" (
    echo ERROR: Missing %%~F
    exit /b 1
  )
)

echo All local source checks passed.
exit /b 0
