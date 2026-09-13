@echo off
setlocal EnableExtensions

title Synth Browser - Full Windows Build

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ============================================================
echo                    SYNTH BROWSER
echo             FULL WINDOWS BUILD + ACCEPTANCE
echo ============================================================
echo.
echo This is the canonical final execution entrypoint.
echo It runs:
echo   - Windows/MSVC/depot_tools preflight
echo   - source gates and production-boundary checks
echo   - pinned Chromium 152 bootstrap
echo   - Azecotron build + native ContentMain host build
echo   - Rust fmt/clippy/tests
echo   - native runtime smoke
echo   - privacy/cookie/tracker tests
echo   - profile isolation
echo   - DevTools
echo   - media/WebRTC
echo   - measured performance
echo   - packaging
echo   - release gate
echo.
echo No result is promoted to VERIFIED unless the command succeeds.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scriptsacceptanceun-full-windows.ps1"
if errorlevel 1 (
  echo.
  echo ============================================================
  echo              SYNTH BROWSER BUILD FAILED
  echo ============================================================
  echo Check the first failing acceptance step above.
  exit /b 1
)

echo.
echo ============================================================
echo             SYNTH BROWSER BUILD + ACCEPTANCE PASSED
echo ============================================================
echo.
echo Installer artifacts:
echo   %ROOT%release
echo.
echo Native Chromium runtime:
echo   %ROOT%third_partyazecotron-chromiumsrcoutAzecotron
echo.
exit /b 0
