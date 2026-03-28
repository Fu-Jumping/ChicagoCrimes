"""
PyInstaller entry point for the backend server.
This script is used instead of main.py to avoid uvicorn's reload mode.
"""
import sys
import uvicorn
from main import app  # noqa: F401 - imports the FastAPI app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False,        # MUST be False for PyInstaller
        log_level="info",
    )
