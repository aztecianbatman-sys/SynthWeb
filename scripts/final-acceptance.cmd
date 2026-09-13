@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0.."
set "FAIL=0"

echo ==============================================
echo Synth Browser final acceptance harness
echo ==============================================

call "%~dp0acceptance-source-audit.cmd"
if errorlevel 1 set "FAIL=1"

if not exist "%ROOT%\src-tauri\target" (
  echo [INFO] Rust target directory does not exist yet.
)

where cargo >nul 2>&1
if errorlevel 1 (
  echo [INFO] Cargo unavailable. Runtime-quality tests will remain pending.
  set "FAIL=1"
) else (
  pushd "%ROOT%\src-tauri"
  cargo fmt --check
  if errorlevel 1 set "FAIL=1"
  cargo test
  if errorlevel 1 set "FAIL=1"
  popd
)

if exist "%ROOT%\third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe" (
  call "%~dp0smoke-azecotron.cmd"
  if errorlevel 1 set "FAIL=1"
) else (
  echo [INFO] Azecotron executable not built yet.
)

echo.
echo Runtime verification matrix:
echo  [ ] HWND embedding
echo  [ ] navigation/back/forward/reload
echo  [ ] renderer + GPU startup
echo  [ ] downloads
echo  [ ] permissions
echo  [ ] DevTools
echo  [ ] extensions
echo  [ ] media/WebRTC/PiP/fullscreen
echo  [ ] profile isolation
echo  [ ] tracker blocking/cookie isolation
echo  [ ] crash recovery
echo  [ ] 10/50/100/200 tab benchmarks
echo  [ ] 1h/4h stability
echo  [ ] installer/upgrade/uninstall
echo.
if "%FAIL%"=="0" (
  echo SOURCE + AVAILABLE RUNTIME GATES: PASS
  echo Remaining unchecked items require actual Windows runtime execution.
  exit /b 0
)
echo ACCEPTANCE HARNESS: FAIL or runtime prerequisites missing.
exit /b 1
