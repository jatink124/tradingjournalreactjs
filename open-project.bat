@echo off
REM open-project.bat - opens the repo in VS Code, starts dev server, opens browser
cd /d "%~dp0"

REM If `code` is on PATH, open VS Code in this folder
start "VSCode" cmd /c "where code >nul 2>&1 && start "" code . || echo 'VS Code command-line not found; skipping.'"

REM Start dev server in a new terminal window. Run npm install only if node_modules missing.
if exist node_modules (
  start "Dev Server" cmd /k "npm run dev"
) else (
  start "Dev Server" cmd /k "npm install && npm run dev"
)

REM Wait a few seconds then open localhost:3000 in default browser
timeout /t 4 /nobreak > nul
start "" http://localhost:3000

exit /b 0
