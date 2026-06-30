@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  SPC — Solutions Portal & Collaterals  |  Launcher
:: ============================================================

:: Relaunch inside a persistent cmd /k window when double-clicked,
:: so the output is never lost on exit or crash.
if "%_SPC_RELAUNCHED%"=="" (
    set _SPC_RELAUNCHED=1
    start "SPC — Solutions Portal & Collaterals" cmd /k ""%~f0""
    exit /b
)

title SPC — Solutions Portal ^& Collaterals
set "LOGFILE=%~dp0spc-startup.log"

:: Create / clear the log file
type nul > "%LOGFILE%"

call :LOG "====================================================="
call :LOG "  SPC - Solutions Portal and Collaterals"
call :LOG "  Started: %DATE% %TIME%"
call :LOG "====================================================="
call :BLANK

:: ------------------------------------------------------------
:: Node.js
:: ------------------------------------------------------------
call :LOG "[CHECK] Verifying Node.js..."
where node >nul 2>&1
if errorlevel 1 (
    call :LOG "[ERROR] Node.js not found. Install from https://nodejs.org"
    goto :FAIL
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
call :LOG "[OK]    Node.js !NODE_VER!"

:: ------------------------------------------------------------
:: npm
:: ------------------------------------------------------------
where npm >nul 2>&1
if errorlevel 1 (
    call :LOG "[ERROR] npm not found. Reinstall Node.js."
    goto :FAIL
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
call :LOG "[OK]    npm v!NPM_VER!"

:: ------------------------------------------------------------
:: Working directory
:: ------------------------------------------------------------
cd /d "%~dp0"
call :LOG "[OK]    Directory: %CD%"

:: ------------------------------------------------------------
:: .env file
:: ------------------------------------------------------------
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        call :LOG "[WARN]  .env missing — copied from .env.example. Fill in API keys."
    ) else (
        call :LOG "[WARN]  No .env or .env.example found. Some features disabled."
    )
) else (
    call :LOG "[OK]    .env found."
)

:: ------------------------------------------------------------
:: node_modules
:: ------------------------------------------------------------
if not exist "node_modules" (
    call :LOG "[INFO]  Running npm install (first-time setup)..."
    npm install >> "%LOGFILE%" 2>&1
    if errorlevel 1 (
        call :LOG "[ERROR] npm install failed. Check internet connection."
        goto :FAIL
    )
    call :LOG "[OK]    Dependencies installed."
) else (
    call :LOG "[OK]    node_modules present."
)

:: ------------------------------------------------------------
:: Port check — kill port 4567 (app) and 24678 (Vite HMR)
:: ------------------------------------------------------------
set APP_PORT=4567
set HMR_PORT=24678

for %%P in (%APP_PORT% %HMR_PORT%) do (
    netstat -ano | findstr ":%%P " | findstr "LISTENING" >nul 2>&1
    if not errorlevel 1 (
        call :LOG "[WARN]  Port %%P is in use — freeing it..."
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
            call :LOG "[INFO]  Killing PID %%p on port %%P..."
            taskkill /PID %%p /F >nul 2>&1
        )
    ) else (
        call :LOG "[OK]    Port %%P is free."
    )
)

:: Wait 2 s to let the OS release the ports
timeout /t 2 /nobreak >nul

:: Verify port 4567 is actually free before launching
netstat -ano | findstr ":%APP_PORT% " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    call :LOG "[ERROR] Port %APP_PORT% still in use after kill. Try running as Administrator."
    goto :FAIL
)
call :LOG "[OK]    Port %APP_PORT% confirmed free."

:: ------------------------------------------------------------
:: Launch — pipe through PowerShell Tee so output goes to
::           BOTH the screen and the log file simultaneously
:: ------------------------------------------------------------
call :BLANK
call :LOG "====================================================="
call :LOG "  LAUNCHING  http://localhost:%APP_PORT%"
call :LOG "  Ctrl+C to stop the server"
call :LOG "  Log file: %LOGFILE%"
call :LOG "====================================================="
call :BLANK

set PORT=%APP_PORT%
set NODE_ENV=development

npx tsx backend/server.ts 2>&1 | powershell -NoProfile -Command "$input | Tee-Object -FilePath '%LOGFILE%' -Append"

:: Capture exit code from the tsx side of the pipe via ERRORLEVEL trick
set TSX_EXIT=!ERRORLEVEL!

:: ------------------------------------------------------------
:: Server stopped — window stays open (cmd /k keeps it alive)
:: ------------------------------------------------------------
call :BLANK
call :LOG "[INFO]  Server stopped  (exit code: !TSX_EXIT!)"
call :LOG "[INFO]  Review full log: %LOGFILE%"
echo.
echo  =====================================================
echo   Server has stopped (exit code: !TSX_EXIT!)
echo   Scroll up to read the output, or open:
echo   %LOGFILE%
echo  =====================================================
echo.
echo  This window will stay open. Press Ctrl+C or close it when done.
goto :EOF

:: ------------------------------------------------------------
:FAIL
echo.
echo  =====================================================
echo   STARTUP FAILED — see error above or open:
echo   %LOGFILE%
echo  =====================================================
echo.
echo  This window will stay open. Press Ctrl+C or close it when done.
goto :EOF

:: ------------------------------------------------------------
:: :LOG  — echo to screen and append to log file
:: ------------------------------------------------------------
:LOG
echo %~1
echo %~1 >> "%LOGFILE%"
exit /b

:: ------------------------------------------------------------
:: :BLANK — print blank line to screen and log without "ECHO is off."
:: ------------------------------------------------------------
:BLANK
echo(
echo( >> "%LOGFILE%"
exit /b
