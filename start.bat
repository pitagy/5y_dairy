@echo off
chcp 65001 > nul
title 5년 일기장 실행기

cd /d "%~dp0"

:: 1. 필수 라이브러리(node_modules) 존재 여부 확인 및 설치
if not exist "node_modules\" (
    echo ========================================================
    echo  5년 일기장 로컬 실행에 필요한 라이브러리를 설치합니다...
    echo  (최초 1회만 진행됩니다. 잠시만 기다려 주세요.)
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

:: 2. 브라우저 띄우기 및 로컬 웹 서버 실행
echo ========================================================
echo  5년 일기장을 로컬 서버(http://localhost:5500)에서 실행합니다.
echo  일기장을 종료하려면 이 창을 닫으세요.
echo ========================================================
echo.

start "" "http://localhost:5500"
call npx http-server . -p 5500 -c-1
