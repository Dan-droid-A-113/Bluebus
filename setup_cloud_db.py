"""
Blue Bus — Cloud Database Setup & Migration CLI Tool
Connects, tests, migrates, and seeds any Cloud SQL DBMS (Neon, Supabase, Render, Aiven, Railway, etc.)
"""

import sys
import os
import argparse
from pathlib import Path

# Ensure root directory is on PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def normalize_db_url(url: str) -> str:
    url = url.strip().strip("'").strip('"')
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

def test_and_setup_database(db_url: str):
    print("=" * 70)
    print(" [BUS] BLUE BUS -- CLOUD SQL DATABASE SETUP & SEED UTILITY")
    print("=" * 70)
    
    clean_url = normalize_db_url(db_url)
    
    # Hide password in terminal output
    display_url = clean_url
    if "@" in display_url and ":" in display_url.split("@")[0]:
        parts = display_url.split("@")
        user_pass = parts[0]
        prefix = user_pass.split(":")[0] + "://" + user_pass.split("://")[1].split(":")[0]
        display_url = f"{prefix}:****@{parts[1]}"
        
    print(f"[*] Target Cloud Database: {display_url}")
    print("[*] Testing live connection to cloud DBMS...")
    
    try:
        connect_args = {"check_same_thread": False} if "sqlite" in clean_url else {}
        engine = create_engine(
            clean_url,
            connect_args=connect_args,
            pool_pre_ping=True,
            echo=False
        )
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            assert result == 1
        print("[OK] Cloud database connection successful!")
        
    except Exception as e:
        print(f"[FAIL] Failed to connect to cloud database: {e}")
        print("\nTip: Ensure the connection string includes valid credentials and '?sslmode=require' if required by the cloud host.")
        return False
        
    # Create Tables & Seed
    print("\n[*] Initializing database schema (13 tables)...")
    try:
        from backend.app import models
        from backend.app.database import Base
        from backend.app.seed_data import seed_database
        
        Base.metadata.create_all(bind=engine)
        print("[OK] All tables created successfully!")
        
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = Session()
        try:
            print("[*] Seeding realistic bus routes, operators, schedules, and captions...")
            seed_database(db)
            
            # Count seeded items
            user_count = db.query(models.User).count()
            bus_count = db.query(models.Bus).count()
            trip_count = db.query(models.Trip).count()
            seat_count = db.query(models.Seat).count()
            
            print(f"[OK] Cloud database populated with:")
            print(f"    - {user_count} User accounts (including Rahul Sharma & Admin)")
            print(f"    - {bus_count} Buses & Operators (IntrCity, SRS, Orange, Greenline)")
            print(f"    - {trip_count} Scheduled trips across Indian metro routes")
            print(f"    - {seat_count} Berths/Seats with safety badges & travel captions")
        finally:
            db.close()
            
    except Exception as e:
        print(f"[FAIL] Error during schema creation/seeding: {e}")
        return False

    # Save to .env
    env_file = ROOT_DIR / ".env"
    try:
        env_lines = []
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.startswith("DATABASE_URL="):
                        env_lines.append(line.rstrip())
                        
        env_lines.append(f"DATABASE_URL={clean_url}")
        
        with open(env_file, "w", encoding="utf-8") as f:
            f.write("\n".join(env_lines) + "\n")
            
        print(f"\n[OK] Saved active cloud connection string to: {env_file}")
        print("[OK] Any backend restart will now use this cloud database automatically!")
        print("\nTo start your backend with this cloud DB:")
        print("    python run_backend.py")
        print("=" * 70)
        return True
    except Exception as e:
        print(f"[!] Note: Could not write to .env automatically: {e}")
        return True

def main():
    parser = argparse.ArgumentParser(description="Blue Bus Cloud SQL Database Configurator")
    parser.add_argument("--url", type=str, help="Cloud PostgreSQL or MySQL connection URL")
    args = parser.parse_args()
    
    if args.url:
        success = test_and_setup_database(args.url)
        sys.exit(0 if success else 1)
        
    print("=" * 70)
    print(" [BUS] BLUE BUS -- FREE CLOUD SQL DBMS SETUP")
    print("=" * 70)
    print("Recommended 100% Free Cloud SQL Providers (No Credit Card Required):")
    print(" 1. Neon Serverless Postgres (https://neon.tech) - 0.5 GB free serverless Postgres")
    print(" 2. Supabase (https://supabase.com) - 500 MB free managed PostgreSQL")
    print(" 3. Render PostgreSQL (https://render.com) - 1 GB free cloud PostgreSQL")
    print(" 4. Aiven / Railway / CockroachDB - Free tier PostgreSQL")
    print("=" * 70)
    
    current_db = os.getenv("DATABASE_URL")
    if current_db:
        print(f"Current DATABASE_URL found: {current_db[:30]}...")
        use_current = input("Do you want to test and migrate to this database? (Y/n): ").strip().lower()
        if use_current in ("", "y", "yes"):
            success = test_and_setup_database(current_db)
            sys.exit(0 if success else 1)
            
    user_url = input("\nEnter your Cloud Database Connection String (e.g. postgresql://user:pass@host/db): ").strip()
    if not user_url:
        print("No URL provided. Exiting without changes.")
        sys.exit(1)
        
    success = test_and_setup_database(user_url)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
