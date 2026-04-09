@echo off
echo ============================================================
echo  FFXIV Marketboard Analyst — DEV MODE
echo  FastAPI  : http://127.0.0.1:8000
echo  Vite dev : http://127.0.0.1:5173  (use this in browser)
echo ============================================================
echo.

:: Install Node deps if missing
if not exist frontend\node_modules (
    echo Installing Node dependencies...
    cd frontend
    npm install
    cd ..
)

:: Start FastAPI in background
echo Starting FastAPI backend...
start "FFXIV Backend" python app.py

:: Short wait for Python to start
timeout /t 2 /nobreak >nul

:: Start Vite dev server (foreground)
echo Starting Vite dev server...
cd frontend
npm run dev
