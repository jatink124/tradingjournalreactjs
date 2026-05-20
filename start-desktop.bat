@echo off
powershell -WindowStyle Hidden -Command "Start-Process 'npm' -ArgumentList 'run dev' -WindowStyle Hidden"
timeout /t 5 /nobreak >nul
start http://localhost:3000