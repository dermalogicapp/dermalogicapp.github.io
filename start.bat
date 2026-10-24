@echo off
REM Double-click this file to start DermaLogic.
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  echo Starting DermaLogic with Node.js...
  node tools\serve.mjs
  goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Starting DermaLogic with Python...
  start "" http://localhost:5173
  py -m http.server 5173
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo Starting DermaLogic with Python...
  start "" http://localhost:5173
  python -m http.server 5173
  goto :end
)

echo Node.js and Python were not found, so opening the all-in-one version instead.
start "" "%~dp0DermaLogic.html"

:end
pause
