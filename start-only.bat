@echo off
REM start-only.bat - starts dev server and opens browser (no VS Code)
cd /d "%~dp0"

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
