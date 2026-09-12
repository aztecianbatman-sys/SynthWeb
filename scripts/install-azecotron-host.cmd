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
copy /Y "%ROOT%\azecotron\app\synth_browser_context.h" "%APP_DST%\synth_browser_context.h" >nul
copy /Y "%ROOT%\azecotron\app\synth_browser_context.cc" "%APP_DST%\synth_browser_context.cc" >nul
copy /Y "%ROOT%\azecotron\app\synth_browser_main_parts.h" "%APP_DST%\synth_browser_main_parts.h" >nul
copy /Y "%ROOT%\azecotron\app\synth_browser_main_parts.cc" "%APP_DST%\synth_browser_main_parts.cc" >nul
copy /Y "%ROOT%\azecotron\app\synth_content_browser_client.h" "%APP_DST%\synth_content_browser_client.h" >nul
copy /Y "%ROOT%\azecotron\app\synth_content_browser_client.cc" "%APP_DST%\synth_content_browser_client.cc" >nul
copy /Y "%ROOT%\azecotron\app\synth_content_main_delegate.h" "%APP_DST%\synth_content_main_delegate.h" >nul
copy /Y "%ROOT%\azecotron\app\synth_content_main_delegate.cc" "%APP_DST%\synth_content_main_delegate.cc" >nul
copy /Y "%ROOT%\azecotron\app\synth_tracker_throttle.h" "%APP_DST%\synth_tracker_throttle.h" >nul
copy /Y "%ROOT%\azecotron\app\synth_tracker_throttle.cc" "%APP_DST%\synth_tracker_throttle.cc" >nul

echo Native Azecotron Content API host installed at:
echo %HOST_DST%
exit /b 0

