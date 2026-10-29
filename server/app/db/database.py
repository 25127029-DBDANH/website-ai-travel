import sqlite3
import os
import json
import uuid
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "travel_ai.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        avatar_url TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Preferences table (Yeu cau 1 & 7)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        favorite_districts TEXT,
        preferred_categories TEXT,
        budget_level TEXT,
        transport_mode TEXT,
        dietary_notes TEXT,
        ai_memory_notes TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 3. Trips table (Yeu cau 2 & 5)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        num_days INTEGER NOT NULL,
        stay_district TEXT NOT NULL,
        budget_total REAL NOT NULL,
        group_size INTEGER DEFAULT 1,
        transport_mode TEXT DEFAULT 'Xe máy',
        pace_preference TEXT DEFAULT 'Vừa phải',
        special_notes TEXT,
        status TEXT DEFAULT 'active',
        share_token TEXT UNIQUE,
        google_calendar_synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 4. Activities table (Yeu cau 2, 3 & 4)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        place_name TEXT NOT NULL,
        category TEXT NOT NULL,
        district TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        cost_estimate REAL DEFAULT 0,
        contingency_indoor_place TEXT,
        description TEXT,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
    """)

    # 5. Ratings table (Yeu cau 5)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ratings (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating_stars INTEGER NOT NULL,
        feedback_text TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Seed initial test account if not exists
    cursor.execute("SELECT id FROM users WHERE email = 'test@example.com'")
    if not cursor.fetchone():
        test_user_id = str(uuid.uuid4())
        # SHA256 of 'password123'
        import hashlib
        pwd_hash = hashlib.sha256("password123".encode()).hexdigest()
        now = datetime.utcnow().isoformat()
        
        cursor.execute("""
        INSERT INTO users (id, email, password_hash, full_name, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (test_user_id, "test@example.com", pwd_hash, "Nguyễn Văn Du Khách", "https://api.dicebear.com/7.x/avataaars/svg?seed=SaiGon", now))
        
        # Seed user preferences (Yeu cau 7: Returning User)
        fav_districts = json.dumps(["Quận 1", "Quận 3", "Quận 5 (Chợ Lớn)"])
        pref_cats = json.dumps(["Ẩm thực đường phố", "Cà phê & Check-in", "Di tích lịch sử"])
        cursor.execute("""
        INSERT INTO user_preferences (user_id, favorite_districts, preferred_categories, budget_level, transport_mode, dietary_notes, ai_memory_notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (test_user_id, fav_districts, pref_cats, "Vừa phải", "Xe máy", "Thích món cay, thích cà phê sữa đá", "Khách thích khám phá văn hóa Chợ Lớn và ngắm hoàng hôn sông Sài Gòn", now))

    conn.commit()
    conn.close()
    print("[DB] Database initialized successfully with test user: test@example.com / password123")
