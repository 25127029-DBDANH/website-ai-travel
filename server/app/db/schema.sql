-- DDL Schema cơ sở dữ liệu PostgreSQL 16 - HCMC AI Travel Planner

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng Người dùng (Bắt buộc đăng nhập theo Yêu cầu 1)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    auth_provider VARCHAR(50) DEFAULT 'local', -- 'local' hoặc 'google'
    google_id VARCHAR(255) UNIQUE,
    google_access_token TEXT,
    google_refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Sở thích & Bộ nhớ du lịch của người dùng (Yêu cầu 1 & 7)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    favorite_districts TEXT[],        -- ['Quận 1', 'Quận 3', 'Quận 5']
    preferred_categories TEXT[],      -- ['ẩm thực', 'di tích lịch sử', 'cafe']
    budget_level VARCHAR(50),         -- 'Tiết kiệm', 'Trung bình', 'Cao cấp'
    transportation_mode VARCHAR(50),  -- 'Xe máy', 'Đi bộ', 'Taxi/Grab'
    dietary_notes TEXT,               -- Ăn chay, dị ứng...
    ai_memory_notes TEXT,             -- Ghi chú bổ sung do AI phân tích từ lịch sử
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_pref UNIQUE(user_id)
);

-- 3. Bảng Chuyến đi (Yêu cầu 2 & 5)
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    num_days INT NOT NULL,
    stay_district VARCHAR(100) NOT NULL,
    budget_total NUMERIC(15, 2),
    group_size INT DEFAULT 1,
    transport_mode VARCHAR(50) DEFAULT 'Xe máy',
    pace_preference VARCHAR(50) DEFAULT 'Vừa phải',
    special_notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'draft', 'active', 'completed'
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(100) UNIQUE,
    google_calendar_synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Lịch trình từng ngày
CREATE TABLE IF NOT EXISTS trip_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    date DATE NOT NULL,
    theme_title VARCHAR(255),
    notes TEXT,
    CONSTRAINT unique_trip_day UNIQUE(trip_id, day_number)
);

-- 5. Bảng Hoạt động chi tiết từng giờ (Yêu cầu 2 & 3)
CREATE TABLE IF NOT EXISTS day_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
    place_name VARCHAR(255) NOT NULL,
    place_id VARCHAR(255), -- Google Place ID
    address TEXT,
    district VARCHAR(100),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    cost_estimate NUMERIC(12, 2) DEFAULT 0,
    category VARCHAR(100), -- 'Tham quan', 'Ăn uống', 'Cafe', 'Mua sắm'
    contingency_indoor_place TEXT, -- Địa điểm trong nhà dự phòng khi trời mưa (Yêu cầu 4)
    google_calendar_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Đánh giá & Phản hồi Lịch trình (Yêu cầu 5)
CREATE TABLE IF NOT EXISTS trip_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_stars INT CHECK (rating_stars >= 1 AND rating_stars <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_trip_user_rating UNIQUE(trip_id, user_id)
);
