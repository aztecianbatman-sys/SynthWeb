@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ============================================================
echo SYNTH BROWSER - ONE SHOT WINDOWS BUILD + ACCEPTANCE
echo ============================================================
echo.
echo This script performs the complete remaining execution gate:
echo   1. Windows/depot_tools/MSVC preflight
echo   2. Source acceptance
echo   3. Chromium 152 bootstrap + Azecotron patching
echo   4. Azecotron native browser build
echo   5. Runtime staging
echo   6. Rust format/lint/tests
echo   7. Tauri package
echo   8. Native smoke/privacy/performance/release gates
echo.
echo It does NOT mark anything verified when a gate fails.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\setup-windows-build.ps1"
if errorlevel 1 exit /b 1

call "%ROOT%scripts\acceptance-source-audit.cmd"
if errorlevel 1 exit /b 1

call "%ROOT%scripts\bootstrap-azecotron.cmd"
if errorlevel 1 exit /b 1

call "%ROOT%scripts\verify-azecotron-production-boundary.cmd"
if errorlevel 1 exit /b 1

call "%ROOT%scripts\build-azecotron.cmd"
if errorlevel 1 exit /b 1

call "%ROOT%scripts\build-azecotron-host.cmd"
if errorlevel 1 exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\stage-azecotron-runtime.ps1"
if errorlevel 1 exit /b 1

pushd "%ROOT%src-tauri"
cargo fmt --check
if errorlevel 1 (
  popd
  exit /b 1
)
cargo clippy --all-targets --all-features -- -D warnings
if errorlevel 1 (
  popd
  exit /b 1
)
cargo test --all-features
if errorlevel 1 (
  popd
  exit /b 1
)
cargo tauri build
if errorlevel 1 (
  popd
  exit /b 1
)
popd

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\acceptance\native-runtime-smoke.ps1"
if errorlevel 1 exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\acceptance\privacy-runtime.ps1"
if errorlevel 1 exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\acceptance\performance-runtime.ps1"
if errorlevel 1 exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\acceptance\accessibility-audit.ps1"
if errorlevel 1 exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\acceptance\release-gate.ps1"
if errorlevel 1 exit /b 1

echo.
echo ============================================================
echo SYNTH BROWSER EXECUTION GATE: PASS
echo ============================================================
echo Package output:
echo   %ROOT%src-tauri\target\release\bundle
echo.
echo Final acceptance report should be generated from the Windows
echo runtime results before publishing a release.
exit /b 0
