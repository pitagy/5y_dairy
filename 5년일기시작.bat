@echo off
title 5-Year Diary

set "TARGET_DIR=%~dp0"
if not exist "%TARGET_DIR%index.html" (
    if exist "C:\5y_Diary\index.html" set "TARGET_DIR=C:\5y_Diary\"
    if exist "D:\5y_Diary\index.html" set "TARGET_DIR=D:\5y_Diary\"
    if exist "%USERPROFILE%\5y_Diary\index.html" set "TARGET_DIR=%USERPROFILE%\5y_Diary\"
)

cd /d "%TARGET_DIR%"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ========================================================
    echo  Node.js is not installed. Installing Node.js LTS...
    echo ========================================================
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '$env:TEMP\nodejs.msi'); Start-Process msiexec.exe -ArgumentList '/i', '$env:TEMP\nodejs.msi', '/passive' -Wait; Remove-Item '$env:TEMP\nodejs.msi' -Force}"
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
)

if not exist "node_modules\" (
    echo ========================================================
    echo  Installing required packages for 5-Year Diary...
    echo ========================================================
    call npm install
)

echo ========================================================
echo  Starting 5-Year Diary at http://localhost:5500
echo ========================================================

start "" "http://localhost:5500"
call npx http-server . -p 5500 -c-1