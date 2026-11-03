@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   NGHICH THIEN TU LUYEN V2 - TAO BO CAI WINDOWS

echo ================================================
where node >nul 2>&1
if errorlevel 1 (
 echo CHUA CAI NODE.JS. Cai Node.js 20+ tai nodejs.org
 pause
 exit /b 1
)
call npm install
if errorlevel 1 goto error
call npm test
if errorlevel 1 goto error
call npm run check:build
if errorlevel 1 goto error
call npm run dist:win
if errorlevel 1 goto error
echo.
echo THANH CONG. MO THU MUC release DE LAY FILE .EXE.
start "" "%~dp0release"
pause
exit /b 0
:error
echo Co loi xay ra. Hay chup man hinh Terminal va gui lai.
pause
exit /b 1
