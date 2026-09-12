@echo off
setlocal EnableExtensions

call "%~dp0bootstrap-azecotron.cmd"
if errorlevel 1 exit /b 1

call "%~dp0install-azecotron-host.cmd"
if errorlevel 1 exit /b 1

set "ROOT=%~dp0.."
set "SRC=%ROOT%\third_party\azecotron-chromium\src"
set "OUT=%SRC%\out\Azecotron"

pushd "%SRC%"

if not exist "%OUT%\args.gn" (
  gn gen "%OUT%" --args="is_official_build=true is_debug=false is_chrome_branded=false target_cpu=\"x64\" is_component_build=false symbol_level=0 blink_symbol_level=0 v8_symbol_level=0"
  if errorlevel 1 (
    popd
    echo ERROR: gn gen failed.
    exit /b 1
  )
)

echo Compiling Azecotron Content API host...
autoninja -C "%OUT%" azecotron_runtime_host
if errorlevel 1 (
  popd
  echo ERROR: native host target failed.
  exit /b 1
)

echo Azecotron Content API host compilation target passed.
popd
exit /b 0
