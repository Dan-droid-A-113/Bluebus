import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Check for .env files in root or backend
for env_path in [ROOT_DIR / ".env", BASE_DIR / ".env"]:
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
        except Exception:
            pass

class Settings:
    PROJECT_NAME: str = "Blue Bus Reservation Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "bluebus_super_secret_jwt_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Read database URL (supports cloud PostgreSQL, MySQL, Supabase, Neon, Render, or SQLite)
    _db_url = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/bluebus.db").strip()
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    
    DATABASE_URL: str = _db_url

settings = Settings()

