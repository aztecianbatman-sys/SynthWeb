@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0.."
set "SRC=%ROOT%\third_party\azecotron-chromium\src"

if not exist "%SRC%\.git" (
  echo ERROR: Chromium source checkout not found.
  exit /b 1
)

for /f "usebackq tokens=1,*" %%A in ("%ROOT%\chromium\REVISION") do (
  if /i "%%A"=="Version:" set "AZECOTRON_VERSION=%%B"
  if /i "%%A"=="Revision:" set "AZECOTRON_REVISION=%%B"
)

pushd "%SRC%"
for /f "delims=" %%R in ('git rev-parse HEAD') do set "CURRENT_REV=%%R"

if /i not "!CURRENT_REV!"=="%AZECOTRON_REVISION%" (
  echo ERROR: expected %AZECOTRON_REVISION%
  echo        found    !CURRENT_REV!
  popd
  exit /b 1
)

for %%P in ("%ROOT%\chromium\patches\*.patch") do (
  git apply --check "%%~fP" >nul 2>&1
  if errorlevel 1 (
    git apply --reverse --check "%%~fP" >nul 2>&1
    if errorlevel 1 (
      echo ERROR: patch %%~nxP is neither clean nor already applied.
      popd
      exit /b 1
    )
  )
)

findstr /c:"\"name\": \"Cortis\"" components\search_engines\prepopulated_engines.json >nul
if errorlevel 1 (
  echo ERROR: Cortis provider branding is missing.
  popd
  exit /b 1
)

echo Azecotron source verification passed.
echo Version: %AZECOTRON_VERSION%
echo Revision: %AZECOTRON_REVISION%
echo Cortis provider: present
popd
exit /b 0
