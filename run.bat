@echo off
echo ============================================================
echo  FFXIV Marketboard Analyst
echo ============================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

:: Install Python dependencies if needed
echo Checking Python dependencies...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install Python dependencies.
        pause
        exit /b 1
    )
)

:: Install Node dependencies if needed
if not exist frontend\node_modules (
    echo Installing Node dependencies...
    cd frontend
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install Node dependencies.
        pause
        exit /b 1
    )
    cd ..
)

:: Build the frontend
echo Building frontend...
cd frontend
npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)
cd ..

:: Create cache dir silently
if not exist cache mkdir cache

echo.
echo Starting server at http://127.0.0.1:8000
echo Open the URL above in your browser.
echo Press Ctrl+C to stop.
echo.
python app.py
pause
