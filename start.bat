@echo off
REM ============================================================
REM  Trip Planner — backend launcher
REM  Double-click this file to start the Node.js backend on :5000
REM ============================================================

setlocal

REM Always run relative to this script's folder, not the cwd it was
REM launched from (so it works from a shortcut, Explorer, or terminal).
cd /d "%~dp0backend"

if not exist "package.json" (
    echo.
    echo [ERROR] backend\package.json not found at:
    echo         %CD%
    echo Make sure start.bat sits next to the "backend" folder.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo.
    echo [INFO] node_modules not found — installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed. Check the messages above.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ============================================================
echo  Starting Trip Planner backend on http://localhost:5000
echo  Frontend: open login.html with VS Code Live Server (port 5500 or 5501)
echo  Press Ctrl+C in the new window to stop the server.
echo ============================================================
echo.

REM Open the backend in its own persistent window so logs stay visible
REM and a crash does not close the terminal before you can read it.
start "TripPlanner Backend" cmd /k "npm start"

endlocal
exit /b 0
