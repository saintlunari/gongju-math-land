@echo off
chcp 65001 > nul
title Gongju Math Land Server
color 0b

echo ========================================================
echo   Gongju Multiplication Land Game Server
echo ========================================================

set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;%USERPROFILE%\AppData\Local\Programs\node"

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/teacher.html"
node server.js

pause
