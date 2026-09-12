@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
set "SRC=%ROOT%\third_party\azecotron-chromium\src"
set "HOST_DST=%SRC%\azecotron\host"
set "APP_DST=%SRC%\azecotron\app"

if not exist "%SRC%\.git" (
  echo ERROR: pinned Chromium checkout is missing.
  echo Run scripts\bootstrap-azecotron.cmd first.
  exit /b 1
)

if not exist "%HOST_DST%" mkdir "%HOST_DST%"
if not exist "%APP_DST%" mkdir "%APP_DST%"

copy /Y "%ROOT%\azecotron\host\azecotron_runtime_host.h" "%HOST_DST%\azecotron_runtime_host.h" >nul
copy /Y "%ROOT%\azecotron\host\azecotron_runtime_host.cc" "%HOST_DST%\azecotron_runtime_host.cc" >nul
copy /Y "%ROOT%\azecotron\host\BUILD.gn" "%HOST_DST%\BUILD.gn" >nul
copy /Y "%ROOT%\azecotron\app\azecotron_app_main.cc" "%APP_DST%\azecotron_app_main.cc" >nul
copy /Y "%ROOT%\azecotron\app\BUILD.gn" "%APP_DST%\BUILD.gn" >nul

echo Native Azecotron Content API host installed at:
echo %HOST_DST%
exit /b 0

