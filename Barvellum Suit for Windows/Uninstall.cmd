@echo off
setlocal
set "setup=%~dp0Resources\Uninstall.ps1"
if not exist "%setup%" set "setup=%~dp0Uninstall.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%setup%"
if errorlevel 1 pause
