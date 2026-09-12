@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0.."
for /f "usebackq tokens=1,*" %%A in ("%ROOT%\chromium\REVISION") do (
  if /i "%%A"=="Version:" set "AZECOTRON_VERSION=%%B"
  if /i "%%A"=="Revision:" set "AZECOTRON_REVISION=%%B"
)

if not defined AZECOTRON_VERSION (
  echo ERROR: Could not read Chromium Version from chromium\REVISION
  exit /b 1
)
if not defined AZECOTRON_REVISION (
  echo ERROR: Could not read Chromium Revision from chromium\REVISION
  exit /b 1
)

where fetch >nul 2>nul
if errorlevel 1 (
  echo ERROR: depot_tools is not on PATH.
  exit /b 1
)
where gclient >nul 2>nul
if errorlevel 1 (
  echo ERROR: gclient is not on PATH.
  exit /b 1
)

if not exist "%ROOT%\third_party\azecotron-chromium\src\.git" (
  if not exist "%ROOT%\third_party\azecotron-chromium" mkdir "%ROOT%\third_party\azecotron-chromium"
  pushd "%ROOT%\third_party\azecotron-chromium"
  echo Fetching Chromium source with depot_tools...
  fetch --no-history chromium
  if errorlevel 1 (
    popd
    echo ERROR: Chromium fetch failed.
    exit /b 1
  )
  popd
)

pushd "%ROOT%\third_party\azecotron-chromium\src"

git fetch --tags origin "refs/tags/%AZECOTRON_VERSION%" --depth=1
if errorlevel 1 (
  echo ERROR: Could not fetch pinned Chromium tag.
  popd
  exit /b 1
)

git checkout --detach "%AZECOTRON_REVISION%"
if errorlevel 1 (
  popd
  echo ERROR: pinned Chromium revision is unavailable.
  exit /b 1
)

for /f "delims=" %%R in ('git rev-parse HEAD') do set "CURRENT_REV=%%R"
if /i not "!CURRENT_REV!"=="%AZECOTRON_REVISION%" (
  echo ERROR: checkout revision mismatch.
  popd
  exit /b 1
)

echo Syncing Chromium dependencies...
gclient sync
if errorlevel 1 (
  popd
  echo ERROR: gclient sync failed.
  exit /b 1
)

echo Verifying Azecotron patch series...
for %%P in ("%ROOT%\chromium\patches\*.patch") do (
  echo Checking %%~nxP
  git apply --check "%%~fP"
  if errorlevel 1 (
    echo ERROR: Patch drift detected in %%~nxP
    echo Build aborted.
    popd
    exit /b 1
  )
)

for %%P in ("%ROOT%\chromium\patches\*.patch") do (
  echo Applying %%~nxP
  git apply "%%~fP"
  if errorlevel 1 (
    echo ERROR: Failed applying %%~nxP
    popd
    exit /b 1
  )
)

echo Azecotron Chromium source is prepared.
echo Version: %AZECOTRON_VERSION%
echo Revision: %AZECOTRON_REVISION%
popd
exit /b 0
