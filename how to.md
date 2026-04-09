# How to Start the Server

## Prerequisites

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)

---

## Production (recommended)

Builds the frontend and serves everything through FastAPI on a single port.

```bat
run.bat
```

Open your browser at: **http://127.0.0.1:8000**

The script will automatically:
1. Check that Python and Node.js are installed
2. Install Python dependencies (`pip install -r requirements.txt`)
3. Install Node dependencies (`npm install` inside `frontend/`)
4. Build the frontend (`npm run build`)
5. Start the FastAPI server

---

## Development mode

Runs the backend and a Vite dev server separately with hot-reload.

```bat
run_dev.bat
```

| Service | URL |
|---------|-----|
| FastAPI backend | http://127.0.0.1:8000 |
| Vite dev server | **http://127.0.0.1:5173** ← open this |

The script will automatically install missing dependencies before starting.

---

## Manual start (if needed)

```bat
# Install Python deps
pip install -r requirements.txt

# Install Node deps
cd frontend
npm install

# Build frontend (production only)
npm run build
cd ..

# Start the server
python app.py
```
