@echo off
title 5-Year Diary Launcher

set "CONFIG_FILE=%LOCALAPPDATA%\5y_diary_path.txt"
set "TARGET_DIR="

:: 1. Current Folder First
if exist "%~dp0index.html" if exist "%~dp0manifest.json" (
    set "TARGET_DIR=%~dp0"
    goto :FOUND
)

:: 2. Saved Config Path
if exist "%CONFIG_FILE%" (
    set /p SAVED_DIR=<"%CONFIG_FILE%"
    if exist "!SAVED_DIR!\index.html" (
        set "TARGET_DIR=!SAVED_DIR!"
        goto :FOUND
    )
)

:: 3. Common Locations
if exist "C:\5y_Diary\index.html" (
    set "TARGET_DIR=C:\5y_Diary"
    goto :FOUND
)
if exist "D:\5y_Diary\index.html" (
    set "TARGET_DIR=D:\5y_Diary"
    goto :FOUND
)
if exist "%USERPROFILE%\5y_Diary\index.html" (
    set "TARGET_DIR=%USERPROFILE%\5y_Diary"
    goto :FOUND
)
if exist "%USERPROFILE%\Desktop\5y_Diary\index.html" (
    set "TARGET_DIR=%USERPROFILE%\Desktop\5y_Diary"
    goto :FOUND
)

:: 4. Search Drives if not found
echo Searching for 5y_Diary project folder...
for /f "delims=" %%I in ('powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Free -gt 0} | ForEach-Object { Get-ChildItem -Path $_.Root -Directory -Filter '5y_Diary' -Recurse -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName 'index.html') } | Select-Object -First 1 -ExpandProperty FullName }"') do (
    set "TARGET_DIR=%%I"
)

if "%TARGET_DIR%"=="" (
    echo [ERROR] Could not find 5y_Diary folder.
    pause
    exit /b 1
)

:FOUND
if "%TARGET_DIR:~-1%"=="\" set "TARGET_DIR=%TARGET_DIR:~0,-1%"
> "%CONFIG_FILE%" echo %TARGET_DIR%

cd /d "%TARGET_DIR%"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ========================================================
    echo  Node.js is not installed on this PC.
    echo  Automatically installing Node.js (LTS)...
    echo  Please click 'Yes' if Windows asks for permission.
    echo ========================================================
    echo.
    
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "Write-Host 'Downloading Node.js installer...'; " ^
        "$url = 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi'; " ^
        "$msi = Join-Path $env:TEMP 'nodejs_installer.msi'; " ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
        "(New-Object System.Net.WebClient).DownloadFile($url, $msi); " ^
        "Write-Host 'Installing Node.js... Please wait...'; " ^
        "$p = Start-Process msiexec.exe -ArgumentList '/i', $msi, '/passive' -PassThru; " ^
        "$p.WaitForExit(); " ^
        "Remove-Item $msi -ErrorAction SilentlyContinue"

    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    
    where node >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [NOTICE] Node.js installation finished.
        echo Please restart this batch file to continue.
        echo.
        pause
        exit /b 0
    )
    echo Node.js installation completed successfully!
    echo.
)

:: Install packages if missing
if not exist "node_modules\" (
    echo ========================================================
    echo  Installing required packages for 5-Year Diary...
    echo  (This happens only once. Please wait...)
    echo ========================================================
    echo.
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install packages.
        pause
        exit /b 1
    )
    echo Package installation completed!
)

:: Launch browser and server
echo ========================================================
echo  Starting 5-Year Diary... (%TARGET_DIR%)
echo  Close this window to stop the server.
echo ========================================================
echo.

start "" "http://localhost:5500"
call npx http-server . -p 5500 -c-1