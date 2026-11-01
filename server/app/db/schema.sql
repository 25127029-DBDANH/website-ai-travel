-- ============================================================
-- HCMC AI Travel Planner — Database Schema
-- Author  : Ngô Tấn Đạt (Member 3 — Places & Interactive Map)
-- Version : 1.0.0
-- Engine  : PostgreSQL 16
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for ILIKE full-text search on names

-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(60)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    hashed_password TEXT       NOT NULL,
    full_name     VARCHAR(120),
    avatar_url    TEXT,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- ============================================================
-- TABLE 2: user_preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    -- Travel style tags (array of strings, e.g. ["ẩm thực", "di sản", "check-in"])
    travel_styles      TEXT[]      NOT NULL DEFAULT '{}',
    -- Preferred districts (e.g. ["Quận 1", "Quận 3", "Thủ Đức"])
    preferred_districts TEXT[]     NOT NULL DEFAULT '{}',
    -- Budget range per day in VND
    budget_min         BIGINT      NOT NULL DEFAULT 200000,
    budget_max         BIGINT      NOT NULL DEFAULT 1000000,
    -- Default transport mode: "walk" | "motorbike" | "taxi" | "bus"
    default_transport  VARCHAR(20) NOT NULL DEFAULT 'motorbike',
    -- Pace preference: "relaxed" | "moderate" | "packed"
    default_pace       VARCHAR(20) NOT NULL DEFAULT 'moderate',
    -- Default number of travelers
    default_travelers  SMALLINT    NOT NULL DEFAULT 1,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: places  (100+ HCMC locations — seeded via hcmc_data.py)
-- ============================================================
CREATE TABLE IF NOT EXISTS places (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    name_vi         VARCHAR(200),                    -- Vietnamese display name
    address         TEXT        NOT NULL,
    district        VARCHAR(60)  NOT NULL,            -- "Quận 1", "Thủ Đức", …
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    category        VARCHAR(60)  NOT NULL,            -- "attraction" | "food" | "culture" | "shopping" | "park"
    is_indoor       BOOLEAN     NOT NULL DEFAULT FALSE,  -- used for rain contingency
    open_time       TIME,                             -- opening time (local)
    close_time      TIME,                             -- closing time (local)
    open_days       TEXT[]      NOT NULL DEFAULT '{Mon,Tue,Wed,Thu,Fri,Sat,Sun}',
    entry_fee_vnd   INTEGER     NOT NULL DEFAULT 0,   -- 0 = free
    average_rating  NUMERIC(3,2),                    -- sourced from Google Places / manual
    google_place_id VARCHAR(100),                    -- Google Places API place_id for live enrichment
    photo_url       TEXT,                             -- primary photo
    description     TEXT,
    tags            TEXT[]      NOT NULL DEFAULT '{}', -- e.g. ["check-in", "ẩm thực", "gia đình"]
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_district  ON places (district);
CREATE INDEX IF NOT EXISTS idx_places_category  ON places (category);
CREATE INDEX IF NOT EXISTS idx_places_indoor    ON places (is_indoor);
CREATE INDEX IF NOT EXISTS idx_places_latlon    ON places (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON places USING gin (name gin_trgm_ops);

-- ============================================================
-- TABLE 4: trips
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    -- 8-criteria form snapshot
    num_days        SMALLINT    NOT NULL DEFAULT 1,
    district_focus  VARCHAR(60),
    budget_per_day  BIGINT,
    travel_styles   TEXT[]      NOT NULL DEFAULT '{}',
    num_travelers   SMALLINT    NOT NULL DEFAULT 1,
    transport_mode  VARCHAR(20) NOT NULL DEFAULT 'motorbike',
    pace            VARCHAR(20) NOT NULL DEFAULT 'moderate',
    special_notes   TEXT,
    -- state machine: "draft" | "suggested" | "confirmed" | "shared"
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    share_token     VARCHAR(64)  UNIQUE,            -- populated on share action
    is_featured     BOOLEAN     NOT NULL DEFAULT FALSE,
    -- Google Calendar sync
    calendar_synced BOOLEAN     NOT NULL DEFAULT FALSE,
    calendar_event_ids TEXT[]   NOT NULL DEFAULT '{}',
    -- AI quality rating
    ai_rating       SMALLINT    CHECK (ai_rating BETWEEN 1 AND 5),
    ai_rating_note  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id     ON trips (user_id);
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON trips (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_featured    ON trips (is_featured) WHERE is_featured = TRUE;

-- ============================================================
-- TABLE 5: trip_days
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_days (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id     UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number  SMALLINT    NOT NULL,           -- 1, 2, 3, …
    date        DATE,                           -- optional concrete date
    theme       VARCHAR(120),                   -- e.g. "Khám phá Quận 5 — Chợ Lớn"
    summary     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_trip_days_trip ON trip_days (trip_id);

-- ============================================================
-- TABLE 6: trip_activities
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_activities (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_day_id     UUID        NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
    place_id        UUID        REFERENCES places(id) ON DELETE SET NULL,
    order_index     SMALLINT    NOT NULL,        -- ordering within the day
    start_time      TIME        NOT NULL,
    end_time        TIME        NOT NULL,
    -- Snapshot of place info at time of generation (denormalised for read speed)
    place_name      VARCHAR(200) NOT NULL,
    place_address   TEXT,
    place_latitude  DOUBLE PRECISION,
    place_longitude DOUBLE PRECISION,
    activity_type   VARCHAR(60),                -- "visit" | "meal" | "transit" | "break"
    notes           TEXT,                       -- AI-generated tips / descriptions
    estimated_cost  INTEGER     NOT NULL DEFAULT 0,
    -- Transit to NEXT activity
    transit_minutes SMALLINT    NOT NULL DEFAULT 0,
    transit_mode    VARCHAR(20),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_activities_day ON trip_activities (trip_day_id);

-- ============================================================
-- TABLE 7: trip_ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_ratings (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id    UUID        NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars      SMALLINT    NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: auto-update updated_at on users & trips
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_trips_updated_at ON trips;
CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
