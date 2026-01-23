@echo off
REM start.bat - finds project root and starts dev server + browser from anywhere

setlocal enabledelayedexpansion

REM Start from script location
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=!SCRIPT_DIR!"

REM Search upward for package.json to find project root
:find_project
if exist "!PROJECT_DIR!package.json" (
  goto found_project
)

REM Go up one directory
for %%A in ("!PROJECT_DIR:~0,-1!") do set "PROJECT_DIR=%%~dpA"

REM Prevent infinite loop (stop at drive root)
if "!PROJECT_DIR!"=="!SCRIPT_DIR!" (
  echo Error: Could not find project root (package.json not found^)
  pause
  exit /b 1
)

goto find_project

:found_project
cd /d "!PROJECT_DIR!"
echo Starting project from: !PROJECT_DIR!

REM Ensure node_modules exists, install if needed
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

REM Start dev server in a new terminal window
start "Dev Server" cmd /k "npm run dev"

REM Wait a few seconds then open localhost:3000 in default browser
timeout /t 4 /nobreak > nul
start "" http://localhost:3000

exit /b 0
