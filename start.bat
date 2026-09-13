@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title 5년 일기장 실행기

set "CONFIG_FILE=%LOCALAPPDATA%\5y_diary_path.txt"
set "TARGET_DIR="

:: 1. 이전에 저장된 설정 파일의 경로가 유효한지 확인
if exist "%CONFIG_FILE%" (
    set /p SAVED_DIR=<"%CONFIG_FILE%"
    if exist "!SAVED_DIR!\index.html" if exist "!SAVED_DIR!\manifest.json" (
        set "TARGET_DIR=!SAVED_DIR!"
        goto :FOUND
    )
)

:: 2. 자주 사용되는 주요 위치 우선 빠른 탐색
for %%D in (
    "%~dp0"
    "C:\5y_Diary"
    "D:\5y_Diary"
    "E:\5y_Diary"
    "%USERPROFILE%\5y_Diary"
    "%USERPROFILE%\Documents\5y_Diary"
    "%USERPROFILE%\Desktop\5y_Diary"
    "%USERPROFILE%\OneDrive\바탕 화면\5y_Diary"
    "%USERPROFILE%\OneDrive\문서\5y_Diary"
    "%USERPROFILE%\OneDrive\Documents\5y_Diary"
) do (
    if exist "%%~fD\index.html" if exist "%%~fD\manifest.json" (
        set "TARGET_DIR=%%~fD"
        goto :SAVE_AND_PROCEED
    )
)

:: 3. 기본 경로에 없을 경우 드라이브 내 5y_Diary 폴더 자동 검색
echo ========================================================
echo  5y_Diary 프로젝트 폴더를 찾는 중입니다...
echo  (최초 1회 검색 후 다음부터는 자동으로 기억하여 바로 실행됩니다.)
echo ========================================================
echo.

for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command ^
    "$drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Free -gt 0 } | Select-Object -ExpandProperty Root; " ^
    "foreach ($d in $drives) { " ^
    "  $found = Get-ChildItem -Path $d -Directory -Filter '5y_Diary' -Recurse -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName 'index.html') } | Select-Object -First 1; " ^
    "  if ($found) { Write-Output $found.FullName; break } " ^
    "}"`) do (
    set "TARGET_DIR=%%P"
)

if "!TARGET_DIR!"=="" (
    echo.
    echo [오류] '5y_Diary' 프로젝트 폴더를 찾을 수 없습니다.
    echo 폴더 이름이 5y_Diary인지 확인해 주세요.
    pause
    exit /b 1
)

:SAVE_AND_PROCEED
echo !TARGET_DIR!> "%CONFIG_FILE%"
echo 프로젝트 폴더를 찾았습니다: !TARGET_DIR!
echo 설정이 저장되었습니다.
echo.

:FOUND
cd /d "!TARGET_DIR!"

:: 필수 라이브러리(node_modules) 존재 여부 확인 및 설치
if not exist "node_modules\" (
    echo ========================================================
    echo  5년 일기장 로컬 실행에 필요한 라이브러리를 설치합니다...
    echo  (최초 1회만 진행됩니다. 잠시만 기억되며 설치됩니다.)
    echo ========================================================
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [오류] 라이브러리 설치 중 문제가 발생했습니다.
        echo 인터넷 연결 상태를 확인한 후 다시 실행해 주세요.
        pause
        exit /b 1
    )
    echo.
    echo 라이브러리 설치가 완료되었습니다!
    timeout /t 2 > nul
)

:: 브라우저 띄우기 및 로컬 웹 서버 실행
echo ========================================================
echo  5년 일기장을 실행합니다. (!TARGET_DIR!)
echo  일기장을 종료하려면 이 창을 닫으세요.
echo ========================================================
echo.

start "" "http://localhost:5500"
call npx http-server . -p 5500 -c-1

