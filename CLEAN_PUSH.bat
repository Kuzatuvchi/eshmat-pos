@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ====== CONFIG ======
set "ROOT=%~dp0"
set "REPO_NAME=eshmat-pos"
REM ====================

echo ==========================================
echo  %REPO_NAME% - CLEAN + GIT PREP SCRIPT
echo  Folder: %ROOT%
echo ==========================================
echo.

REM 1) Basic checks
if not exist "%ROOT%frontend" (
  echo [ERROR] frontend folder topilmadi. Skriptni loyiha ildizida ishga tushiring.
  pause
  exit /b 1
)
if not exist "%ROOT%backend" (
  echo [ERROR] backend folder topilmadi. Skriptni loyiha ildizida ishga tushiring.
  pause
  exit /b 1
)

REM 2) Ensure .gitignore has required entries
if not exist "%ROOT%.gitignore" (
  echo [INFO] .gitignore topilmadi, yangisini yarataman...
  > "%ROOT%.gitignore" (
    echo node_modules
    echo .next
    echo .env
    echo .env.local
    echo .DS_Store
    echo dist
    echo build
  )
) else (
  echo [INFO] .gitignore bor. Zarur qatorlar borligini tekshiring.
)

REM 3) Remove local build artifacts (safe)
echo.
echo [STEP] Local artefaktlarni o'chirish...
if exist "%ROOT%frontend\.next" (
  echo   - Removing frontend\.next
  rmdir /s /q "%ROOT%frontend\.next"
)
if exist "%ROOT%frontend\node_modules" (
  echo   - Removing frontend\node_modules
  rmdir /s /q "%ROOT%frontend\node_modules"
)
if exist "%ROOT%backend\node_modules" (
  echo   - Removing backend\node_modules
  rmdir /s /q "%ROOT%backend\node_modules"
)

REM optional: root node_modules if exists
if exist "%ROOT%node_modules" (
  echo   - Removing root node_modules
  rmdir /s /q "%ROOT%node_modules"
)

REM 4) Remove env files locally (optional but recommended)
echo.
echo [STEP] .env fayllarni o'chirish (GitHubga chiqmasin)...
if exist "%ROOT%.env" (
  echo   - Deleting .env (root)
  del /q "%ROOT%.env"
)
if exist "%ROOT%frontend\.env.local" (
  echo   - Deleting frontend\.env.local
  del /q "%ROOT%frontend\.env.local"
)
if exist "%ROOT%backend\.env" (
  echo   - Deleting backend\.env
  del /q "%ROOT%backend\.env"
)

REM 5) Git cleanup (remove cached tracked artifacts)
echo.
echo [STEP] Git keshni tozalash (.next/node_modules tracking bo'lsa olib tashlaydi)...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [WARN] Git repo emas. Git qismini o'tkazib yuboryapman.
  goto :END
)

REM Remove cached if accidentally tracked
git rm -r --cached frontend/.next frontend/node_modules backend/node_modules node_modules >nul 2>&1

REM 6) Add + commit (only if changes exist)
echo.
echo [STEP] Git status:
git status

echo.
echo [STEP] Stage all changes...
git add -A

REM Check if there is anything to commit
for /f "tokens=*" %%A in ('git status --porcelain') do (
  set "HASCHANGES=1"
  goto :DO_COMMIT
)
set "HASCHANGES="
:DO_COMMIT
if not defined HASCHANGES (
  echo [INFO] Commit qiladigan o'zgarish yo'q (working tree clean).
  goto :END
)

echo.
echo [STEP] Commit...
git commit -m "chore: clean build artifacts and env files"

echo.
echo [STEP] Push...
git push

:END
echo.
echo ✅ Tayyor! Tozalash tugadi.
echo Endi Vercel'da Redeploy qiling va cache'ni o'chiring (Use existing Build Cache = OFF).
pause
endlocal
