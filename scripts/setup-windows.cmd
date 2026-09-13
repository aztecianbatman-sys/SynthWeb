@echo off
setlocal EnableExtensions
set "ROOT=%~dp0.."

echo === Synth Browser Windows setup check ===
where git >nul 2>&1 || (echo ERROR: Git missing. & exit /b 1)
where node >nul 2>&1 || (echo ERROR: Node.js missing. & exit /b 1)
where cargo >nul 2>&1 || (echo ERROR: Rust/Cargo missing. & exit /b 1)
where rustup >nul 2>&1 || (echo ERROR: rustup missing. & exit /b 1)
where fetch >nul 2>&1 || (echo ERROR: depot_tools fetch missing from PATH. & exit /b 1)
where gclient >nul 2>&1 || (echo ERROR: depot_tools gclient missing from PATH. & exit /b 1)
where gn >nul 2>&1 || (echo ERROR: depot_tools gn missing from PATH. & exit /b 1)
where autoninja >nul 2>&1 || (echo ERROR: depot_tools autoninja missing from PATH. & exit /b 1)

echo [PASS] Core tools found.
git config --global core.longpaths true

echo.
echo Visual Studio Build Tools must provide the Chromium Windows toolchain.
echo Run this script from a Developer Command Prompt with the required
echo Windows SDK/MSVC environment loaded.
exit /b 0
