@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Luma - Neon adatbazis telepito
 echo ============================================
echo LUMA - Neon adatbazis inicializalasa
echo ============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo HIBA: Nincs telepitve a Node.js.
  echo Telepitsd a Node.js LTS verziojat innen: https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo HIBA: Az npm nem talalhato. Telepitsd ujra a Node.js LTS-t.
  pause
  exit /b 1
)
if not exist .env (
  echo HIBA: Nem talalom a .env fajlt a projekt mappajaban.
  pause
  exit /b 1
)
echo 1/3 - Fuggosegek telepitese...
call npm install
if errorlevel 1 goto error
echo.
echo 2/3 - Prisma kliens generalasa...
call npx prisma generate
if errorlevel 1 goto error
echo.
echo 3/3 - Luma adatbazis tablainak letrehozasa Neonon...
call npx prisma db push
if errorlevel 1 goto error
echo.
echo SIKER! Az adatbazis inicializalasa befejezodott.
echo A projekt inditasa: npm run dev
pause
exit /b 0
:error
echo.
echo HIBA tortent. A fenti hibauzenetet mentsd el vagy fotozd le.
pause
exit /b 1
