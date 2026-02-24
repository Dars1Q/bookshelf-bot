@echo off
echo Останавливаем старые процессы бота...
taskkill /F /FI "WINDOWTITLE eq *BookShelf*" /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo Запускаем бота...
cd /d %~dp0
title BookShelf Bot
python main.py

pause
