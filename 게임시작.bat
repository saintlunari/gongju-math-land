@echo off
chcp 65001 > nul
title ê³µì£¼??ê³±ì…ˆ ?…ë”°ë¨¹ê¸° ?€?‘ì „ ?œë²„
color 0b

echo ========================================================
echo   ?° ì´ˆë“± 2?™ë…„ ê³±ì…ˆ êµ¬êµ¬??- ê³µì£¼???…ë”°ë¨¹ê¸° ?€?‘ì „
echo ========================================================
echo.
echo [1/3] ?œë²„ ?¤í–‰ ?˜ê²½??ì¤€ë¹„í•˜??ì¤‘ìž…?ˆë‹¤...

:: Node.js ê²½ë¡œ ?ìƒ‰
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;%USERPROFILE%\AppData\Local\Programs\node"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [?¤ë¥˜] Node.jsë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤. 
    echo ?„ë¡œê·¸ëž¨???¤ì¹˜?˜ê±°??ê´€ë¦¬ìž?ê²Œ ë¬¸ì˜?´ì£¼?¸ìš”.
    pause
    exit /b
)

echo [2/3] ê²Œìž„ ?œë²„ë¥??œìž‘?©ë‹ˆ??..
echo.

:: 1.5ì´????ë™?¼ë¡œ êµì‚¬???€???”ë©´ ë¸Œë¼?°ì? ?´ê¸°
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:3000/teacher.html"

:: ?œë²„ ?¤í–‰
node server.js

pause
