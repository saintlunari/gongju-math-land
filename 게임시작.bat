@echo off
chcp 65001 > nul
title 공주시 곱셈 땅따먹기 대작전 서버
color 0b

echo ========================================================
echo   🏰 초등 2학년 곱셈 구구단 - 공주시 땅따먹기 대작전
echo ========================================================
echo.
echo [1/3] 서버 실행 환경을 준비하는 중입니다...

:: Node.js 경로 탐색
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;%USERPROFILE%\AppData\Local\Programs\node"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Node.js를 찾을 수 없습니다. 
    echo 프로그램을 설치하거나 관리자에게 문의해주세요.
    pause
    exit /b
)

echo [2/3] 게임 서버를 시작합니다...
echo.

:: 1.5초 후 자동으로 교사용 대형 화면 브라우저 열기
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/teacher.html"

:: 서버 실행
node server.js

pause
