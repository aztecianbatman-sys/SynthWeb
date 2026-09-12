@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
set /p "TARGET_VERSION=Chromium version to pin: "
set /p "TARGET_REVISION=Exact Chromium commit SHA: "

if "%TARGET_VERSION%"=="" exit /b 1
if "%TARGET_REVISION%"=="" exit /b 1

> "%ROOT%\chromium\REVISION" (
  echo Chromium source pin for Azecotron Web
  echo.
  echo Version: %TARGET_VERSION%
  echo Revision: %TARGET_REVISION%
  echo Source: https://chromium.googlesource.com/chromium/src/+/refs/tags/%TARGET_VERSION%
  echo.
  echo Rebase requires patch checks, Chromium tests, and security review.
)

echo Updated chromium\REVISION.
