@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."

call "%~dp0setup-windows.cmd"
if errorlevel 1 exit /b 1

call "%~dp0acceptance-source-audit.cmd"
if errorlevel 1 exit /b 1

call "%~dp0test-local.cmd"
if errorlevel 1 exit /b 1

echo === Rust quality gate ===
pushd "%ROOT%\src-tauri"
cargo fmt --check
if errorlevel 1 exit /b 1
cargo clippy --all-targets --all-features -- -D warnings
if errorlevel 1 exit /b 1
cargo test
if errorlevel 1 exit /b 1
popd

echo === Native Azecotron build ===
call "%~dp0bootstrap-azecotron.cmd"
if errorlevel 1 exit /b 1
call "%~dp0build-azecotron.cmd"
if errorlevel 1 exit /b 1
call "%~dp0build-azecotron-host.cmd"
if errorlevel 1 exit /b 1

echo === Synth Browser package ===
pushd "%ROOT%\src-tauri"
cargo tauri build
if errorlevel 1 exit /b 1
popd

echo RELEASE BUILD: PASS
echo Package output is under src-tauri\target\release\bundle
exit /b 0
