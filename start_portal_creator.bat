@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  Mobius Portal Creator — Launcher
::  Starts the app on port 4567 with full debug output
:: ============================================================

title Mobius Portal Creator

echo.
echo  =====================================================
echo   MOBIUS PORTAL CREATOR — STARTUP
echo  =====================================================
echo.

:: ------------------------------------------------------------
:: Step 1: Verify Node.js is installed
:: ------------------------------------------------------------
echo [CHECK] Verifying Node.js installation...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [OK]    Node.js found: %NODE_VER%

:: ------------------------------------------------------------
:: Step 2: Verify npm is installed
:: ------------------------------------------------------------
echo [CHECK] Verifying npm installation...
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Please reinstall Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo [OK]    npm found: v%NPM_VER%

:: ------------------------------------------------------------
:: Step 3: Navigate to project directory
:: ------------------------------------------------------------
echo [INFO]  Changing to project directory...
cd /d "%~dp0"
echo [OK]    Working directory: %CD%

:: ------------------------------------------------------------
:: Step 4: Check .env file exists
:: ------------------------------------------------------------
echo [CHECK] Looking for .env file...
if not exist ".env" (
    echo [WARN]  .env not found. Copying from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK]    .env created from .env.example. Please fill in your API keys.
    ) else (
        echo [WARN]  .env.example also missing. Continuing without .env — some features may be disabled.
    )
) else (
    echo [OK]    .env file found.
)

:: ------------------------------------------------------------
:: Step 5: Check node_modules exist
:: ------------------------------------------------------------
echo [CHECK] Checking node_modules...
if not exist "node_modules" (
    echo [INFO]  node_modules not found. Running npm install...
    echo [INFO]  This may take a minute on first run...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check your internet connection or package.json.
        pause
        exit /b 1
    )
    echo [OK]    Dependencies installed successfully.
) else (
    echo [OK]    node_modules present.
)

:: ------------------------------------------------------------
:: Step 6: Confirm port
:: ------------------------------------------------------------
set APP_PORT=4567
echo [INFO]  Target port: %APP_PORT%

:: Check if port is already in use
echo [CHECK] Checking if port %APP_PORT% is free...
netstat -ano | findstr ":%APP_PORT% " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [WARN]  Port %APP_PORT% is already in use. Another process may be running.
    echo [WARN]  The app will attempt to start anyway — you may see an EADDRINUSE error.
)

:: ------------------------------------------------------------
:: Step 7: Set environment and launch
:: ------------------------------------------------------------
echo.
echo  =====================================================
echo   LAUNCHING SERVER
echo   URL: http://localhost:%APP_PORT%
echo   Press Ctrl+C to stop
echo  =====================================================
echo.

set PORT=%APP_PORT%
set NODE_ENV=development
set DEBUG=*

:: Run with tsx for full TypeScript + debug output
npx tsx --env-file=.env server.ts

:: ------------------------------------------------------------
:: Exit handling
:: ------------------------------------------------------------
echo.
echo [INFO]  Server process exited.
pause
endlocal
