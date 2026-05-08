@echo off
echo Starting Restaurant POS...
cd /d "%~dp0"
npm run build
npm start
pause

