-- DDL Schema PostgreSQL 16 (Chuẩn hóa v3 theo 7 Yêu cầu mới của Giảng viên)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Bảng tài khoản người dùng (Bắt buộc đăng nhập)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30),
    password_hash TEXT,
    email VARCHAR(254),
    google_sub VARCHAR(64) UNIQUE,
    display_name VARCHAR(60),
    google_calendar_token TEXT, -- OAuth Token cho Google Calendar
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT users_login_method CHECK (
        google_sub IS NOT NULL OR (username IS NOT NULL AND password_hash IS NOT NULL)
    ),
    CONSTRAINT users_username_format CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,30}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email)) WHERE email IS NOT NULL;

-- 2. Bảng token đặt lại mật khẩu
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng chuyến đi (trips) - Bắt buộc user_id, bổ sung 8 trường TP.HCM
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(120),
    start_location TEXT NOT NULL,
    districts JSONB NOT NULL DEFAULT '["Quận 1"]'::jsonb, -- Quận cụ thể tại TP.HCM
    budget INTEGER NOT NULL CHECK (budget > 0),
    days SMALLINT NOT NULL CHECK (days BETWEEN 1 AND 14),
    preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    group_size VARCHAR(20) DEFAULT 'solo', -- solo | couple | friends | family
    transport VARCHAR(30) DEFAULT 'grab',  -- walk | grab | rental | bus
    pace VARCHAR(20) DEFAULT 'moderate',   -- relaxed | moderate | packed
    special_notes TEXT,                    -- Ghi chú đặc biệt (ăn chay, người già...)
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'suggesting', 'confirmed', 'completed')),
    share_token VARCHAR(32) UNIQUE,
    shared_at TIMESTAMPTZ,
    ai_review JSONB,                       -- Báo cáo đánh giá và chấm điểm từ AI
    google_calendar_synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token);

-- 4. Bảng bộ đệm địa điểm Google Places (places_cache) - TTL 7 ngày
CREATE TABLE IF NOT EXISTS places_cache (
    place_id_google VARCHAR(255) PRIMARY KEY,
    name TEXT NOT NULL,
    rating NUMERIC(2,1),
    address TEXT,
    types JSONB DEFAULT '[]'::jsonb,
    opening_hours JSONB DEFAULT '[]'::jsonb,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    photo_url TEXT,
    is_indoor BOOLEAN DEFAULT FALSE, -- Phục vụ phương án dự phòng trời mưa
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_places_cache_name ON places_cache USING GIN (to_tsvector('simple', name));

-- 5. Bảng các chặng trong lịch trình (itinerary_items)
CREATE TABLE IF NOT EXISTS itinerary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number SMALLINT NOT NULL CHECK (day_number >= 1),
    order_index SMALLINT NOT NULL CHECK (order_index >= 1),
    time_slot VARCHAR(50) NOT NULL,
    place_name TEXT NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL CHECK (category IN ('food', 'sightseeing', 'cafe', 'shopping', 'nature', 'entertainment')),
    place_id_google VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    estimated_cost INTEGER NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
    transit_info JSONB DEFAULT NULL,
    is_indoor BOOLEAN DEFAULT FALSE,
    google_event_id VARCHAR(255), -- ID sự kiện trên Google Calendar
    UNIQUE (trip_id, day_number, order_index)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_trip_day ON itinerary_items(trip_id, day_number, order_index);

-- 6. Bảng lưu trữ hội thoại nhiều lượt (conversations)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    role VARCHAR(15) NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    map_card JSONB DEFAULT NULL, -- Dữ liệu thẻ bản đồ gửi kèm trong chat
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_trip_id ON conversations(trip_id, created_at);
