@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  SPC — Solutions Portal & Collaterals
::  Launcher — opens a persistent window so errors are visible
:: ============================================================

:: If we were double-clicked (no parent cmd), relaunch inside a
:: persistent cmd /k window so the output is never lost.
if "%_SPC_RELAUNCHED%"=="" (
    set _SPC_RELAUNCHED=1
    start "SPC — Solutions Portal & Collaterals" cmd /k ""%~f0""
    exit /b
)

title SPC — Solutions Portal ^& Collaterals

set LOGFILE=%~dp0spc-startup.log
echo. > "%LOGFILE%"

call :log "====================================================="
call :log "  SPC — Solutions Portal ^& Collaterals"
call :log "  %DATE% %TIME%"
call :log "====================================================="
call :log ""

:: ------------------------------------------------------------
:: Step 1: Node.js
:: ------------------------------------------------------------
call :log "[CHECK] Verifying Node.js..."
where node >nul 2>&1
if errorlevel 1 (
    call :log "[ERROR] Node.js not found. Install from https://nodejs.org"
    goto :die
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
call :log "[OK]    Node.js %NODE_VER%"

:: ------------------------------------------------------------
:: Step 2: npm
:: ------------------------------------------------------------
where npm >nul 2>&1
if errorlevel 1 (
    call :log "[ERROR] npm not found. Reinstall Node.js."
    goto :die
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
call :log "[OK]    npm v%NPM_VER%"

:: ------------------------------------------------------------
:: Step 3: Working directory
:: ------------------------------------------------------------
cd /d "%~dp0"
call :log "[OK]    Directory: %CD%"

:: ------------------------------------------------------------
:: Step 4: .env
:: ------------------------------------------------------------
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        call :log "[WARN]  .env missing — copied from .env.example. Fill in API keys."
    ) else (
        call :log "[WARN]  No .env found. Some features disabled."
    )
) else (
    call :log "[OK]    .env found."
)

:: ------------------------------------------------------------
:: Step 5: Dependencies
:: ------------------------------------------------------------
if not exist "node_modules" (
    call :log "[INFO]  Running npm install (first-time setup)..."
    npm install
    if errorlevel 1 (
        call :log "[ERROR] npm install failed. Check internet / package.json."
        goto :die
    )
    call :log "[OK]    Dependencies installed."
) else (
    call :log "[OK]    node_modules present."
)

:: ------------------------------------------------------------
:: Step 6: Port check
:: ------------------------------------------------------------
set APP_PORT=4567
netstat -ano | findstr ":%APP_PORT% " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    call :log "[WARN]  Port %APP_PORT% already in use — may see EADDRINUSE."
) else (
    call :log "[OK]    Port %APP_PORT% is free."
)

:: ------------------------------------------------------------
:: Step 7: Launch
:: ------------------------------------------------------------
call :log ""
call :log "====================================================="
call :log "  LAUNCHING  http://localhost:%APP_PORT%"
call :log "  Press Ctrl+C to stop"
call :log "====================================================="
call :log ""
call :log "[INFO]  Log saved to: %LOGFILE%"
call :log ""

set PORT=%APP_PORT%
set NODE_ENV=development

npx tsx backend/server.ts
set EXIT_CODE=%errorlevel%

:: ------------------------------------------------------------
:: Server exited — keep window open to show the error
:: ------------------------------------------------------------
call :log ""
call :log "[INFO]  Server stopped (exit code %EXIT_CODE%)."
call :log "[INFO]  Full log: %LOGFILE%"
echo.
echo  =====================================================
echo   Server has stopped (exit code %EXIT_CODE%).
echo   Scroll up to read the error, or open:
echo   %LOGFILE%
echo  =====================================================
echo.
echo  Press any key to close this window...
pause >nul
endlocal
exit /b %EXIT_CODE%

:: ------------------------------------------------------------
:die
:: ------------------------------------------------------------
echo.
echo  =====================================================
echo   STARTUP FAILED — see error above or:
echo   %LOGFILE%
echo  =====================================================
echo.
echo  Press any key to close this window...
pause >nul
endlocal
exit /b 1

:: ------------------------------------------------------------
:log
:: ------------------------------------------------------------
echo %~1
echo %~1 >> "%LOGFILE%"
exit /b
