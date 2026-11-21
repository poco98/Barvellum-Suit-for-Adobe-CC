@echo off
setlocal
set "setup=%~dp0Resources\Install.ps1"
if not exist "%setup%" set "setup=%~dp0Install.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%setup%"
if errorlevel 1 pause
