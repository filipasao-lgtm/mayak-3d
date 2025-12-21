@echo off
setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH.
    echo.
    set /p "CHOICE=Would you like to open https://nodejs.org/ to install it now? (Y/N): "
    if /i "!CHOICE!"=="Y" (
        start https://nodejs.org/
    )
    echo.
    echo After installing Node.js, re-run launch.bat.
    echo.
    pause
    exit /b 1
)

REM Check if dist folder exists
if not exist "%SCRIPT_DIR%dist" (
    echo.
    echo ERROR: dist folder not found!
    echo.
    echo Please make sure you're running this from the correct directory.
    echo.
    pause
    exit /b 1
)

echo.
echo Starting MAYAK 3D application...
echo.

REM Start the server
cd /d "%SCRIPT_DIR%"
node server.js

REM Keep window open if there's an error
pause
