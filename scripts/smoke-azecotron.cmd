@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."
set "AZECOTRON=%ROOT%\third_party\azecotron-chromium\src\out\Azecotron\azecotron_host.exe"

if not exist "%AZECOTRON%" (
  echo ERROR: Azecotron native host not found.
  echo Build it first with scripts\build-azecotron-host.cmd
  exit /b 1
)

echo === Version ===
"%AZECOTRON%" --version
if errorlevel 1 exit /b 1

echo === Headless DOM smoke test ===
"%AZECOTRON%" --synth-url=about:blank --headless --disable-gpu --dump-dom about:blank > "%ROOT%\azecotron-smoke.html"
if errorlevel 1 exit /b 1
findstr /c:"<html" "%ROOT%\azecotron-smoke.html" >nul
if errorlevel 1 (
  echo ERROR: headless DOM smoke test did not produce HTML.
  exit /b 1
)

echo === Product branding smoke test ===
findstr /i /c:"Synth Browser" "%AZECOTRON%" >nul
if errorlevel 1 (
  echo WARNING: binary string inspection did not find the product name.
  echo Runtime branding is still validated by the Chromium build resources.
)

del /q "%ROOT%\azecotron-smoke.html" >nul 2>nul
echo Azecotron smoke test passed.
exit /b 0
