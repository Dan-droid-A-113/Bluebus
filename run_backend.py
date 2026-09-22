import uvicorn
import os
import sys

# Ensure bluebus root is in pythonpath
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Starting Blue Bus API Server on http://localhost:8080 ...")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8080, reload=True)
