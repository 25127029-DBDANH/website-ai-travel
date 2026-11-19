# 🏗️ 02. Kiến Trúc Hệ Thống, Cơ Sở Dữ Liệu, Dịch Vụ Lõi & AI Prompt

> **Tài liệu hợp nhất:** Gộp từ `03-kien-truc-api-db.md`, `04-prompt-ai-flow.md`, `06-error-handling.md`, `07-security.md` và các tài liệu thiết kế dịch vụ `12-1` → `12-8`.
> *(Đặc tả OpenAPI 3.0 chi tiết cho các endpoints nằm tại [`docs/openapi.yaml`](./openapi.yaml)).*

## Mục lục
- 1. Kiến trúc Hệ thống, API Contracts & DB
- 2. Kỹ thuật Prompt & Luồng Xử lý AI (Gemini)
- 3. Lược đồ CSDL (Database Schema)
- 4. Thuật toán Tuyến đường & Cước xe (Transit Calculator)
- 5. Dịch vụ Địa điểm & Cache (Place Service)
- 6. Dịch vụ Quản lý Chuyến đi (Trip Service)
- 7. Dữ liệu Mồi & Demo Seed
- 8. Danh tính, Xác thực & Tầng Thích ứng (Identity, Auth & Adaptive)
- 9. Xử lý lỗi (Error Handling) & Bảo mật (Security)

---

## 🏗️ 3. Kiến trúc Hệ thống, API Contracts & Cơ sở Dữ liệu v3

## 3.1. Mô hình Danh tính & Bảo mật Mới
- Không còn hỗ trợ chế độ Khách thao tác trên các tiện ích tạo chuyến.
- Mọi request tạo chuyến, xem bản đồ, đồng bộ lịch bắt buộc phải có header:
  `Authorization: Bearer <JWT>`
- Token JWT chứa `sub: user_id` và được FastAPI dependency `get_current_user` (`server/app/core/dependencies.py`) xác thực tính toàn vẹn.

## 3.2. Bảng Danh sách API Bổ sung theo Kiến trúc v2 Hoàn thiện

| Method | Endpoint | Chức năng mới | Input | Output |
|---|---|---|---|---|
| `POST` | `/api/trips` | Tạo chuyến đi với form 8 trường | `{ days, districts, budget, preferences, group_size, transport, pace, notes }` | `{ trip_id, status: 'draft', itinerary: [...] }` |
| `POST` | `/api/trips/:id/swap` | Đổi địa điểm thông minh (Smart Swap) | `{ stop_id, reason?: string }` | `{ alternatives: [...], updated_itinerary }` |
| `POST` | `/api/trips/:id/contingency` | Kích hoạt phương án dự phòng thời tiết/kẹt xe | `{ reason: 'rain' \| 'traffic' \| 'closed' \| 'budget' }` | `{ backup_plan, updated_itinerary, message }` |
| `POST` | `/api/trips/:id/review` | Yêu cầu AI chấm điểm & đánh giá lịch trình | Không | `{ score, strengths, warnings, insider_tips }` |
| `POST` | `/api/trips/:id/calendar` | Đẩy lịch trình lên Google Calendar | `{ start_date }` | `{ success: true, calendar_link, synced_events }` |
| `GET`  | `/api/trips/:id/export-ics` | Xuất file chuẩn lịch quốc tế `.ICS` | Không | File stream `.ics` |
| `GET`  | `/api/me/previous-preferences` | Lấy sở thích cũ để điền sẵn vào form | Không | `{ has_history: true, preferences: {...} }` |
| `PATCH`| `/api/trips/:id/stops/:stopId` | Cập nhật check-in chặng thực tế (`visited`, ảnh, note) | `{ visited: boolean, photo_url?: string }` | `{ stop_id, visited: true, updated_at }` |
| `POST` | `/api/transit/fare-estimate` | Tính cước 3 hãng xe (Grab / Xanh SM / Be) theo tọa độ | `{ origin_coords, dest_coords }` | `{ grab: {...}, xanh_sm: {...}, be: {...} }` |
| `PATCH`| `/api/trips/:id/expenses/:id` | Cập nhật số tiền thực chi (Inline fare editing) | `{ actual_amount: number }` | `{ expense_id, actual_amount, variance }` |
| `GET`  | `/api/trips/:id/summary` | Lấy dữ liệu tổng kết chuyến đi (4 KPI, 3 nhóm tiền, ảnh) | Không | `{ kpis: {...}, breakdown: {...}, gallery: [...] }` |

## 3.3. Cập nhật Lược đồ Cơ sở Dữ liệu (Schema Updates)
- Bảng `trips`:
  - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE` (Bắt buộc có tài khoản).
  - Thêm các cột: `districts JSONB`, `group_size VARCHAR(20)`, `transport VARCHAR(30)`, `pace VARCHAR(20)`, `special_notes TEXT`, `ai_review JSONB`, `google_calendar_synced BOOLEAN DEFAULT FALSE`.
- Bảng `users`:
  - Bỏ trường cấu hình `trợ lý du lịch TP.HCM chuẩn mực` và `tone`.
  - Thêm trường lưu OAuth Refresh Token cho Google Calendar nếu cần: `google_calendar_token TEXT`.

---

## 🤖 4. Kỹ thuật Prompt & Luồng Xử lý AI v3

## 4.1. Cấu trúc System Instruction Mới (Loại bỏ Persona, Tập trung Chuyên gia Bản địa)

```text
You are "HCMC Travel Expert", an expert, professional, and proactive AI travel planner specializing exclusively in Ho Chi Minh City (Saigon), Vietnam.

CORE BEHAVIOR & RULES:
1. Role: Act as a trusted local travel specialist. Tone must be professional, warm, insightful, concise, and focused on delivering realistic itineraries. (NO gimmicky personas or cartoon characters).
2. Four-Step Planning Flow:
   - When receiving the initial 8-criteria trip form, DO NOT immediately generate a full itinerary. First, provide a concrete concept suggestion summarizing the trip's highlights, key districts, and flow. Ask the user if they agree.
   - Only when the user confirms/agrees, generate the full day-by-day itinerary with exact timing, verified places, and coordinates.
3. Swap Place Handling:
   - When the user asks to swap a place, provide 2-3 verified alternative options in the same district/category, explain the tradeoffs briefly, and update the schedule when chosen.
4. Contingency & Weather Awareness:
   - If informed of rain or bad weather in HCMC, proactively replace outdoor sights (walking streets, open parks) with indoor cultural/culinary alternatives (museums, indoor markets, specialty cafes) within the same district.
   - For evening rush hour (17:00 - 19:00), cluster activities within one district to avoid major traffic congestion points.
5. Anti-Hallucination & Grounding:
   - Never invent venues. Only suggest verified places retrieved via Google Places tools with rating >= 4.0.
```

## 4.2. Luồng Tool Calling Mở rộng
- `suggestConcept(summary, highlights, recommended_districts)`: Gửi tóm tắt định hướng cho Bước 2.
- `searchPlaces(queries[])`: Truy vấn hàng loạt địa điểm thật tại TP.HCM.
- `saveItinerary(days_data)`: Lưu trữ lịch trình có cấu trúc sau khi người dùng đồng ý.
- `suggestSwapAlternatives(place_to_swap, alternatives[])`: Đưa ra 2-3 địa điểm thay thế cụ thể.
- `generateContingencyPlan(reason, affected_day, replacement_items[])`: Kích hoạt phương án thay thế trời mưa/kẹt xe.
- `reviewItinerary(trip_id)`: Phân tích, chấm điểm thang 10, chỉ ra ưu điểm, rủi ro và mẹo bản địa.

---

## 12. Phụ lục Code Implementation Cốt Lõi (Production-Ready Boilerplate)

### 12.1. File `server/src/db/schema.sql` (PostgreSQL 16, bản v2)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 0. [v2] Bảng người dùng. Tạo TRƯỚC trips vì trips tham chiếu tới users.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30),                         -- NULL nếu chỉ đăng nhập bằng Google
    password_hash TEXT,                           -- bcrypt hash, NULL nếu chỉ đăng nhập bằng Google
    email VARCHAR(254),                           -- tùy chọn; cần cho quên mật khẩu
    google_sub VARCHAR(64) UNIQUE,                -- ID cố định của tài khoản Google
    display_name VARCHAR(60),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,  -- trợ lý du lịch TP.HCM chuẩn mực, tone, ai_interaction, theme...
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    -- Phải có ít nhất một cách đăng nhập: Google, hoặc cả username lẫn mật khẩu
    CONSTRAINT users_login_method CHECK (
        google_sub IS NOT NULL OR (username IS NOT NULL AND password_hash IS NOT NULL)
    ),
    CONSTRAINT users_username_format CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,30}$')
);

-- Unique KHÔNG phân biệt hoa thường: "Linh" và "linh" không thể cùng tồn tại
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email)) WHERE email IS NOT NULL;

-- 0b. [v2] Token đặt lại mật khẩu: chỉ lưu HASH, dùng một lần, hết hạn nhanh
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,          -- SHA-256 dạng hex
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Bảng lưu thông tin chuyến đi (khách: phân tách theo session_id; thành viên: theo user_id)
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,   -- [v2] NULL = chuyến của khách
    title VARCHAR(120),                                    -- [v2] tên hiển thị trong My Trips
    start_location TEXT NOT NULL,
    budget INTEGER NOT NULL CHECK (budget > 0),
    days SMALLINT NOT NULL CHECK (days BETWEEN 1 AND 14),
    preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'asking', 'generating', 'completed')),
    source VARCHAR(20) NOT NULL DEFAULT 'form' CHECK (source IN ('form', 'sentence', 'assistant', 'clone')),
    share_token VARCHAR(32) UNIQUE,                        -- [v2] NULL = chưa chia sẻ
    shared_at TIMESTAMPTZ,
    feedback JSONB,                                        -- [v2] đánh giá sau chuyến (P4)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_session_id ON trips(session_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id, created_at DESC);

-- 2. Bảng Cache dữ liệu từ Google Places API (TTL 7 ngày)
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
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_places_cache_name ON places_cache USING GIN (to_tsvector('simple', name));

-- 3. Bảng từng mục hoạt động trong lịch trình
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
    UNIQUE (trip_id, day_number, order_index)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_trip_day ON itinerary_items(trip_id, day_number, order_index);
CREATE INDEX IF NOT EXISTS idx_itinerary_place_id ON itinerary_items(place_id_google);

-- 4. Bảng lưu lịch sử chuyến đi nhiều lượt với Gemini
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    role VARCHAR(15) NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,                    -- [v2] có thể ghi sự kiện swap
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_trip_id ON conversations(trip_id, created_at);

-- 5. [v2] Trí nhớ của AI (Travel Profile). Khóa: 'u:<user_id>' hoặc 's:<session_id>'.
--    Không có FK vì khóa có thể là session của khách -> xóa tài khoản phải xóa bằng code.
CREATE TABLE IF NOT EXISTS travel_profiles (
    owner_key VARCHAR(50) PRIMARY KEY,
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 12.1.b. Lưu ý cấu hình kiểu dữ liệu trong SQLAlchemy & Pydantic (trong `server/app/db/session.py`)

Cột `rating NUMERIC(2,1)` trong PostgreSQL được ánh xạ sang kiểu `Float` trong SQLAlchemy ORM và Pydantic schemas. Trong Pydantic Schema (`server/app/schemas/trip.py`), định nghĩa field: `rating: Optional[float] = None` để tự động parse kiểu số thực (`float`) chuẩn xác cho Client React:

```python
from pydantic import BaseModel
from typing import Optional

class PlaceRatingSchema(BaseModel):
    place_id: str
    rating: Optional[float] = None  # Tự động parse từ Numeric DB sang float
```

---

### 12.2. File `server/app/utils/transit_calculator.py` (Toán học Haversine & Ước tính thời gian di chuyển TP.HCM)

```python
import math
from typing import Optional, Dict, Any

EARTH_RADIUS_KM = 6371.0
HCMC_ROAD_FACTOR = 1.3  # Hệ số đường thực tế nội đô TP.HCM so với đường chim bay

def to_rad(deg: float) -> float:
    return (deg * math.pi) / 180.0

def calculate_transit(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> Optional[Dict[str, Any]]:
    if None in (from_lat, from_lng, to_lat, to_lng):
        return None

    d_lat = to_rad(to_lat - from_lat)
    d_lng = to_rad(to_lng - from_lng)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(to_rad(from_lat)) * math.cos(to_rad(to_lat)) * math.sin(d_lng / 2) ** 2)

    straight_distance_km = 2 * EARTH_RADIUS_KM * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    road_distance_km = round(straight_distance_km * HCMC_ROAD_FACTOR, 2)

    # Khoảng cách <= 800m: Gợi ý đi bộ (~5 km/h)
    if road_distance_km <= 0.8:
        walk_minutes = max(2, round((road_distance_km / 5.0) * 60))
        return {
            "mode": "walk",
            "distance_km": road_distance_km,
            "duration_min": walk_minutes,
            "estimated_fare_vnd": 0,
            "label": f"🚶 {walk_minutes} min walk ({int(road_distance_km * 1000)}m)"
        }

    # Khoảng cách > 800m: Ước tính phương tiện nội đô (~20 km/h, mở cửa 2km đầu 18,000đ + 5,500đ/km tiếp theo)
    ride_minutes = max(5, round((road_distance_km / 20.0) * 60))
    raw_fare = 18000 + max(0.0, road_distance_km - 2) * 5500
    rounded_fare = int(math.ceil(raw_fare / 5000.0) * 5000)

    return {
        "mode": "ride",
        "distance_km": road_distance_km,
        "duration_min": ride_minutes,
        "estimated_fare_vnd": rounded_fare,
        "label": f"🚕 {ride_minutes} min ride (~₫{rounded_fare:,})"
    }
```

---

### 12.3. File `server/app/services/places_service.py` (Google Places API New + Cache TTL + Ẩn API Key)

> Nội dung giữ nguyên từ v1; chỉ sửa lại các URL bị lỗi định dạng markdown (`PLACES_SEARCH_URL`, `mediaUrl`).

```javascript
import pool from '../db/connection.js';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.types',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.photos'
].join(',');

/**
 * Resolve photo reference sang link CDN lh3.googleusercontent.com để không lộ GOOGLE_PLACES_API_KEY
 */
async function resolveSafePhotoUrl(photoName) {
  if (!photoName || !process.env.GOOGLE_PLACES_API_KEY) return null;
  try {
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const res = await fetch(mediaUrl, { redirect: 'manual' });
    const redirectLocation = res.headers.get('location');
    return redirectLocation || null;
  } catch {
    return null;
  }
}

/**
 * Tìm địa điểm kết hợp PostgreSQL Cache (TTL 7 ngày) và Google Places API (New)
 */
export async function searchSingleQuery({ query, type, maxResults = 3 }) {
  // 1. Kiểm tra trong places_cache còn hạn trước
  const cachedRes = await pool.query(
    `SELECT place_id_google AS "placeId", name, rating, address, types,
            opening_hours AS "openingHours", latitude AS lat, longitude AS lng, photo_url AS "photoUrl"
     FROM places_cache
     WHERE expires_at > NOW()
       AND (name ILIKE $1 OR address ILIKE $1)
     LIMIT $2`,
    [`%${query}%`, maxResults]
  );

  if (cachedRes.rows.length >= 2) {
    return cachedRes.rows;
  }

  // 2. Gọi Google Places API (New) Text Search nếu chưa đủ cache
  const response = await fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK
    },
    body: JSON.stringify({
      textQuery: `${query} in Ho Chi Minh City, Vietnam`,
      includedType: type || undefined,
      maxResultCount: Math.min(maxResults, 5)
    })
  });

  if (!response.ok) {
    // Fallback về dữ liệu trong cache kể cả khi hết hạn nếu API lỗi
    const fallbackRes = await pool.query(
      `SELECT place_id_google AS "placeId", name, rating, address,
              opening_hours AS "openingHours", latitude AS lat, longitude AS lng, photo_url AS "photoUrl"
       FROM places_cache
       WHERE name ILIKE $1 OR address ILIKE $1
       LIMIT $2`,
      [`%${query}%`, maxResults]
    );
    return fallbackRes.rows;
  }

  const data = await response.json();
  const places = data.places || [];
  const results = [];

  for (const p of places) {
    const placeId = p.id;
    const name = p.displayName?.text || 'Unknown Venue';
    const rating = p.rating || 4.2;
    const address = p.formattedAddress || 'Ho Chi Minh City';
    const types = p.types || [];
    const openingHours = p.regularOpeningHours?.weekdayDescriptions || [];
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    const firstPhotoName = p.photos?.[0]?.name;
    const photoUrl = await resolveSafePhotoUrl(firstPhotoName);

    if (lat && lng) {
      await pool.query(
        `INSERT INTO places_cache
          (place_id_google, name, rating, address, types, opening_hours, latitude, longitude, photo_url, cached_at, expires_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, NOW(), NOW() + INTERVAL '7 days')
         ON CONFLICT (place_id_google) DO UPDATE SET
          rating = EXCLUDED.rating,
          opening_hours = EXCLUDED.opening_hours,
          photo_url = COALESCE(EXCLUDED.photo_url, places_cache.photo_url),
          cached_at = NOW(),
          expires_at = NOW() + INTERVAL '7 days'`,
        [
          placeId,
          name,
          rating,
          address,
          JSON.stringify(types),
          JSON.stringify(openingHours),
          lat,
          lng,
          photoUrl
        ]
      );

      results.push({ placeId, name, rating, address, openingHours, photoUrl, lat, lng });
    }
  }

  return results;
}

export async function batchSearchPlaces(queries = []) {
  const allResults = await Promise.all(queries.map((q) => searchSingleQuery(q)));
  return allResults.flat();
}
```

---

### 12.4. File `server/app/api/v1/endpoints/trips.py` (Transaction Lưu Lịch Trình, Ngân Sách, My Trips)

> `saveTripItinerary` và `getFullTripWithBudget` giữ nguyên từ v1. **Mới:** `createTrip` (gắn `user_id` nếu là thành viên) và `listTrips` (My Trips, P1). Quyền truy cập được kiểm tra ở route bằng `ownerClause()` (mục 12.6) trước khi gọi các hàm này.

```javascript
import pool from '../db/connection.js';
import { calculateTransit } from '../utils/transitCalculator.js';
import { ownerClause } from '../middleware/identity.js';

export async function saveTripItinerary(tripId, daysData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const dayObj of daysData) {
      const { day_number, items } = dayObj;

      // Xóa các mục cũ của ngày được cập nhật để tránh lệch order_index
      await client.query(
        `DELETE FROM itinerary_items WHERE trip_id = $1 AND day_number = $2`,
        [tripId, day_number]
      );

      const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);

      for (let i = 0; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        const prevItem = i > 0 ? sortedItems[i - 1] : null;

        const transitInfo = prevItem
          ? calculateTransit(prevItem.latitude, prevItem.longitude, item.latitude, item.longitude)
          : null;

        await client.query(
          `INSERT INTO itinerary_items
            (trip_id, day_number, order_index, time_slot, place_name, description,
             category, place_id_google, latitude, longitude, estimated_cost, transit_info)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
          [
            tripId,
            day_number,
            item.order_index,
            item.time_slot,
            item.place_name,
            item.description,
            item.category,
            item.place_id_google || null,
            item.latitude,
            item.longitude,
            item.estimated_cost || 0,
            transitInfo ? JSON.stringify(transitInfo) : null
          ]
        );
      }
    }

    await client.query(`UPDATE trips SET status = 'completed', updated_at = NOW() WHERE id = $1`, [
      tripId
    ]);

    await client.query('COMMIT');
    return await getFullTripWithBudget(tripId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getFullTripWithBudget(tripId) {
  const tripRes = await pool.query(`SELECT * FROM trips WHERE id = $1`, [tripId]);
  const trip = tripRes.rows[0];
  if (!trip) return null;

  const itemsRes = await pool.query(
    `SELECT i.*, p.rating, p.address, p.opening_hours, p.photo_url
     FROM itinerary_items i
     LEFT JOIN places_cache p ON i.place_id_google = p.place_id_google
     WHERE i.trip_id = $1
     ORDER BY i.day_number ASC, i.order_index ASC`,
    [tripId]
  );

  const items = itemsRes.rows;
  const activitiesCost = items.reduce((sum, it) => sum + Number(it.estimated_cost || 0), 0);
  const transitCost = items.reduce(
    (sum, it) => sum + Number(it.transit_info?.estimated_fare_vnd || 0),
    0
  );
  const totalEstimated = activitiesCost + transitCost;
  const percentage = Math.round((totalEstimated / trip.budget) * 100);

  let health = 'under_budget';
  if (percentage > 100) health = 'over_budget';
  else if (percentage >= 80) health = 'near_budget';

  return {
    trip,
    itinerary_items: items,
    budget_summary: {
      total_budget: trip.budget,
      activities_cost: activitiesCost,
      transit_cost: transitCost,
      total_estimated: totalEstimated,
      percentage,
      health
    }
  };
}

/**
 * [v2] Tạo chuyến đi. Thành viên: gắn user_id ngay từ đầu. Khách: user_id = NULL.
 * Nếu JWT còn hạn nhưng tài khoản đã bị xóa, FK sẽ chặn INSERT -> route nên trả 401.
 */
export async function createTrip(principal, { start_location, budget, days, preferences = [], source = 'form' }) {
  // Tên mặc định: "2-day HCMC · street food, cafe" (người dùng đổi tên được trong My Trips)
  const prefText = preferences.slice(0, 2).map((p) => p.replace(/_/g, ' ')).join(', ');
  const title = `${days}-day HCMC · ${prefText || 'custom trip'}`.slice(0, 120);

  const res = await pool.query(
    `INSERT INTO trips (session_id, user_id, title, start_location, budget, days, preferences, source, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'draft')
     RETURNING *`,
    [principal.sessionId, principal.userId, title, start_location, budget, days, JSON.stringify(preferences), source]
  );
  return res.rows[0];
}

/**
 * [v2, P1] My Trips: danh sách chuyến của người dùng hiện tại (khách hoặc thành viên).
 * Tính sẵn số điểm đến và tổng chi phí ước tính để thẻ trong My Trips không cần gọi thêm API.
 */
export async function listTrips(principal, limit = 20) {
  const { clause, params } = ownerClause(principal, 1, 't'); // alias 't' vì có JOIN
  const res = await pool.query(
    `SELECT t.id, t.title, t.start_location, t.days, t.budget, t.status, t.created_at,
            (t.share_token IS NOT NULL) AS is_shared,
            COUNT(i.id)::int AS place_count,
            (COALESCE(SUM(i.estimated_cost), 0)
             + COALESCE(SUM((i.transit_info->>'estimated_fare_vnd')::int), 0))::int AS total_estimated
     FROM trips t
     LEFT JOIN itinerary_items i ON i.trip_id = t.id
     WHERE ${clause}
     GROUP BY t.id
     ORDER BY t.created_at DESC
     LIMIT $${params.length + 1}`,
    [...params, Math.min(limit, 50)]
  );
  return res.rows;
}
```

---

### 12.5. Seed dữ liệu cho buổi thuyết trình

#### 12.5.1. File `server/src/db/seedDemoCache.js` (Pre-warmed Cache)

```javascript
import pool from './connection.js';

const DEMO_PLACES = [
  {
    place_id_google: 'ChIJ7aVxn8ItdTERF5Y65239Q2c',
    name: 'War Remnants Museum',
    rating: 4.6,
    address: '28 Võ Văn Tần, Phường 6, Quận 3, TP.HCM',
    types: ['museum', 'tourist_attraction'],
    opening_hours: ['Daily: 07:30 AM – 05:30 PM'],
    latitude: 10.77951,
    longitude: 106.69209,
    photo_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80'
  },
  {
    place_id_google: 'ChIJL5_p1sItdTERq1X6J8_p1sI',
    name: 'Phở Hòa Pasteur',
    rating: 4.3,
    address: '260C Pasteur, Phường Võ Thị Sáu, Quận 3, TP.HCM',
    types: ['restaurant', 'food'],
    opening_hours: ['Daily: 06:00 AM – 10:30 PM'],
    latitude: 10.78634,
    longitude: 106.68812,
    photo_url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80'
  },
  {
    place_id_google: 'ChIJW8_p1sItdTER98X6J8_p1sB',
    name: 'The Workshop Coffee',
    rating: 4.5,
    address: '27 Ngô Đức Kế, Bến Nghé, Quận 1, TP.HCM',
    types: ['cafe', 'food'],
    opening_hours: ['Daily: 08:00 AM – 09:00 PM'],
    latitude: 10.77452,
    longitude: 106.70391,
    photo_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80'
  },
  {
    place_id_google: 'ChIJB_b1sItdTER12X6J8_p1sC',
    name: 'Bến Thành Street Food Market',
    rating: 4.2,
    address: '26-28-30 Thủ Khoa Huân, Bến Thành, Quận 1, TP.HCM',
    types: ['restaurant', 'food'],
    opening_hours: ['Daily: 09:00 AM – 11:30 PM'],
    latitude: 10.77341,
    longitude: 106.69745,
    photo_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
  },
  {
    place_id_google: 'ChIJH_c1sItdTER44X6J8_p1sD',
    name: 'Heart of Darkness Craft Brewery',
    rating: 4.6,
    address: '31D Lý Tự Trọng, Bến Nghé, Quận 1, TP.HCM',
    types: ['bar', 'restaurant'],
    opening_hours: ['Daily: 11:00 AM – 12:00 AM'],
    latitude: 10.77815,
    longitude: 106.70162,
    photo_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80'
  },
  {
    place_id_google: 'ChIJK_d1sItdTER77X6J8_p1sE',
    name: 'Independence Palace (Reunification Palace)',
    rating: 4.5,
    address: '135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1, TP.HCM',
    types: ['tourist_attraction', 'museum'],
    opening_hours: ['Daily: 08:00 AM – 04:30 PM'],
    latitude: 10.77699,
    longitude: 106.69536,
    photo_url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80'
  }
];

async function seed() {
  for (const p of DEMO_PLACES) {
    await pool.query(
      `INSERT INTO places_cache
        (place_id_google, name, rating, address, types, opening_hours, latitude, longitude, photo_url, cached_at, expires_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, NOW(), NOW() + INTERVAL '14 days')
       ON CONFLICT (place_id_google) DO UPDATE SET
        expires_at = NOW() + INTERVAL '14 days'`,
      [
        p.place_id_google,
        p.name,
        p.rating,
        p.address,
        JSON.stringify(p.types),
        JSON.stringify(p.opening_hours),
        p.latitude,
        p.longitude,
        p.photo_url
      ]
    );
  }
  console.log('✅ Demo cache pre-warmed successfully!');
  process.exit(0);
}

seed();
```

#### 12.5.2. File `server/src/db/seedDemoUser.js` (Tài khoản demo cho Type 2) — mới

Chạy **sau** `seedDemoCache.js`. Tạo tài khoản `demo_traveler` với 3 chuyến `completed` và một Travel Profile, để trên sân khấu chỉ cần đăng nhập là thấy ngay lời chào "Welcome back" của Type 2, không phải tạo 3 chuyến thật trước mặt giảng viên.

```javascript
import bcrypt from 'bcryptjs';
import pool from './connection.js';
import { calculateTransit } from '../utils/transitCalculator.js';

const DEMO_USERNAME = 'demo_traveler';

// 3 chuyến hoàn tất => vượt ngưỡng TIER2_MIN_COMPLETED_TRIPS (3) => Type 2
const DEMO_TRIPS = [
  { title: '2-day HCMC · street food, culture', days: 2, budget: 3000000, prefs: ['street_food', 'culture'] },
  { title: '2-day HCMC · street food, cafe', days: 2, budget: 3000000, prefs: ['street_food', 'cafe'] },
  { title: '3-day HCMC · street food, nightlife', days: 3, budget: 4500000, prefs: ['street_food', 'nightlife'] }
];

// Phải dùng giá trị trong TỪ VỰNG CỐ ĐỊNH (xem sanitizeProfile ở mục 12.8)
const DEMO_PROFILE = {
  food_styles: ['street food', 'specialty coffee'],
  favorite_districts: ['District 1', 'District 3'],
  dislikes: ['crowded places'],
  pace: 'relaxed',
  crowd_tolerance: 'low',
  typical_budget_per_day: 1500000
};

async function seedDemoUser() {
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password) throw new Error('Set DEMO_USER_PASSWORD before seeding the demo user');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Chạy lại nhiều lần được (idempotent): xóa tài khoản cũ nếu có (cascade xóa luôn trips)
    const old = await client.query(`SELECT id FROM users WHERE LOWER(username) = $1`, [DEMO_USERNAME]);
    for (const row of old.rows) {
      await client.query(`DELETE FROM travel_profiles WHERE owner_key = $1`, [`u:${row.id}`]);
      await client.query(`DELETE FROM users WHERE id = $1`, [row.id]);
    }

    const hash = await bcrypt.hash(password, 12);
    const u = await client.query(
      `INSERT INTO users (username, password_hash, display_name)
       VALUES ($1, $2, 'Demo Traveler') RETURNING id`,
      [DEMO_USERNAME, hash]
    );
    const userId = u.rows[0].id;

    // Lấy vài địa điểm đã nạp bởi seedDemoCache.js để My Trips có "place_count" thật
    const places = (await client.query(`SELECT * FROM places_cache ORDER BY name LIMIT 3`)).rows;
    const slots = ['09:00 - 11:00', '12:00 - 13:30', '15:00 - 17:00'];

    for (const t of DEMO_TRIPS) {
      const trip = await client.query(
        `INSERT INTO trips (session_id, user_id, title, start_location, budget, days, preferences, source, status)
         VALUES (gen_random_uuid(), $1, $2, 'District 1, Ho Chi Minh City', $3, $4, $5::jsonb, 'form', 'completed')
         RETURNING id`,
        [userId, t.title, t.budget, t.days, JSON.stringify(t.prefs)]
      );

      for (let i = 0; i < places.length; i++) {
        const p = places[i];
        const prev = i > 0 ? places[i - 1] : null;
        const transit = prev ? calculateTransit(prev.latitude, prev.longitude, p.latitude, p.longitude) : null;
        await client.query(
          `INSERT INTO itinerary_items
            (trip_id, day_number, order_index, time_slot, place_name, description, category,
             place_id_google, latitude, longitude, estimated_cost, transit_info)
           VALUES ($1, 1, $2, $3, $4, 'Seeded demo stop', $5, $6, $7, $8, 60000, $9::jsonb)`,
          [
            trip.rows[0].id, i + 1, slots[i], p.name,
            p.types?.includes('cafe') ? 'cafe' : p.types?.includes('museum') ? 'sightseeing' : 'food',
            p.place_id_google, p.latitude, p.longitude,
            transit ? JSON.stringify(transit) : null
          ]
        );
      }
    }

    await client.query(
      `INSERT INTO travel_profiles (owner_key, profile) VALUES ($1, $2::jsonb)`,
      [`u:${userId}`, JSON.stringify(DEMO_PROFILE)]
    );

    await client.query('COMMIT');
    console.log(`✅ Demo user "${DEMO_USERNAME}" created with ${DEMO_TRIPS.length} completed trips (Type 2).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  process.exit(0);
}

seedDemoUser().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---

## 🛡️ 12-6. Dependency Xác thực Danh tính FastAPI (Identity Dependency v3)
### File: `server/app/core/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI Dependency bắt buộc đăng nhập (Auth Gate v3 - Thực thi Yêu cầu 1).
    Mọi endpoint cá nhân (trips, transit, calendar, review) đều yêu cầu Bearer JWT hợp lệ.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "AUTH_REQUIRED", "message": "Bạn cần đăng nhập để sử dụng tính năng này."}
            )
        return {"id": user_id, "email": payload.get("email")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_TOKEN_INVALID", "message": "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."}
        )
```

---

### 12.7. File `server/app/api/v1/endpoints/auth.py` (Đăng ký / đăng nhập / Google / Claim) — mới

```javascript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db/connection.js';

const BCRYPT_COST = 12;
// Hash "giả": khi username không tồn tại ta VẪN tốn thời gian bcrypt y như khi có.
// Nếu không, kẻ tấn công đo thời gian phản hồi là biết username nào tồn tại.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', BCRYPT_COST);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function authError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

/**
 * Gán chuyến đi (và hồ sơ) của KHÁCH cho tài khoản.
 * PHẢI gọi bên trong transaction của đăng ký / đăng nhập.
 *
 * Trace: khách có session S, đã tạo trip A và B (user_id = NULL).
 *   Đăng ký xong, có user U.
 *   UPDATE ... WHERE session_id = S AND user_id IS NULL
 *     => A và B có user_id = U, rowCount = 2 (trả về làm claimed_trips).
 *   Từ giờ ownerClause cho U thấy A, B; khách với session S không còn thấy (user_id khác NULL).
 *   Gọi lại lần nữa => rowCount = 0 (idempotent), không hỏng gì.
 */
export async function saveUserTripData() {
  const trips = await client.query(
    `UPDATE trips SET user_id = $1, updated_at = NOW()
     WHERE session_id = $2 AND user_id IS NULL`,
    [userId, sessionId]
  );
  // Hồ sơ du lịch của khách: chuyển sang tài khoản nếu tài khoản CHƯA có hồ sơ
  await client.query(
    `UPDATE travel_profiles SET owner_key = $1
     WHERE owner_key = $2
       AND NOT EXISTS (SELECT 1 FROM travel_profiles WHERE owner_key = $1)`,
    [`u:${userId}`, `s:${sessionId}`]
  );
  // Nếu tài khoản đã có hồ sơ thì hồ sơ khách còn sót lại -> xóa để không bị mồ côi
  await client.query(`DELETE FROM travel_profiles WHERE owner_key = $1`, [`s:${sessionId}`]);
  return trips.rowCount;
}

export async function register({ username, password, email }, sessionId) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO users (username, password_hash, email, display_name)
       VALUES ($1, $2, $3, $1)
       RETURNING id, username, email, display_name, settings`,
      [username, passwordHash, email || null]
    );
    const user = ins.rows[0];
    const claimed = await saveUserTripData();
    await client.query('COMMIT');
    return { token: signToken(user.id), user, claimed_trips: claimed };
  } catch (err) {
    await client.query('ROLLBACK'); // lỗi ở bất kỳ bước nào => vẫn là khách, KHÔNG mất chuyến đi nào
    // 23505 = unique_violation: trùng LOWER(username) hoặc LOWER(email)
    if (err.code === '23505') {
      throw authError(409, 'AUTH_USERNAME_TAKEN', 'Username or email already in use');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function login({ username, password }, sessionId) {
  const found = await pool.query(
    `SELECT id, username, email, display_name, settings, password_hash
     FROM users WHERE LOWER(username) = LOWER($1)`,
    [username]
  );
  const row = found.rows[0];

  // Luôn chạy compare (kể cả khi không có user) để thời gian phản hồi giống nhau
  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) {
    // Thông báo CHUNG: không nói sai username hay sai mật khẩu
    throw authError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid username or password');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [row.id]);
    const claimed = await saveUserTripData();
    await client.query('COMMIT');
    const { password_hash, ...user } = row; // KHÔNG trả password_hash ra ngoài
    return { token: signToken(row.id), user, claimed_trips: claimed };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function loginWithGoogle(idToken, sessionId) {
  // 1. BACKEND xác minh ID token (chữ ký, hạn dùng, audience). Không tin gì client tự gửi.
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch {
    throw authError(401, 'GOOGLE_TOKEN_INVALID', 'Google sign-in failed');
  }
  if (!payload?.sub || !payload.email_verified) {
    throw authError(401, 'GOOGLE_TOKEN_INVALID', 'Google sign-in failed');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 2. Tạo mới hoặc đăng nhập theo google_sub. (xmax = 0) là mẹo nhận biết dòng vừa được INSERT.
    const up = await client.query(
      `INSERT INTO users (google_sub, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (google_sub) DO UPDATE SET last_login_at = NOW()
       RETURNING id, username, email, display_name, settings, (xmax = 0) AS is_new`,
      [payload.sub, payload.email, payload.name || null]
    );
    const user = up.rows[0];
    const claimed = await saveUserTripData();
    await client.query('COMMIT');
    const { is_new, ...safeUser } = user;
    return { token: signToken(user.id), user: safeUser, claimed_trips: claimed, is_new };
  } catch (err) {
    await client.query('ROLLBACK');
    // Email này đã thuộc một tài khoản username: v2 KHÔNG tự gộp (Out of Scope, mục 2.2)
    if (err.code === '23505') {
      throw authError(409, 'AUTH_USERNAME_TAKEN', 'This email is already used by another account');
    }
    throw err;
  } finally {
    client.release();
  }
}
```

---

## 🧭 12-8. Tầng Thích ứng Người dùng Cũ & Bỏ Persona v3

## 1. Loại bỏ Personas
- Đã xóa bỏ hoàn toàn định nghĩa file `personas.js` và các tùy chọn phong cách.
- AI phản hồi duy nhất với tư cách là Trợ lý Chuyên gia Du lịch TP.HCM.

## 2. Dịch vụ Người dùng Cũ (Returning Traveler Service)

```javascript
import pool from '../db/connection.js';

/**
 * Kiểm tra lịch sử người dùng cũ để chào mừng và nạp sẵn form
 */
export async function getReturningTravelerData(userId) {
  const tripRes = await pool.query(
    `SELECT title, days, districts, preferences, transport, pace, budget
     FROM trips
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (tripRes.rows.length === 0) {
    return { is_returning: false, prefilled_form: null };
  }

  const lastTrip = tripRes.rows[0];
  return {
    is_returning: true,
    welcome_message: `Chào mừng bạn quay lại! Lần trước bạn đã có chuyến đi rất tuyệt vời tại TP.HCM. Tôi đã điền sẵn các sở thích quen thuộc của bạn vào bảng yêu cầu bên dưới.`,
    prefilled_form: {
      days: lastTrip.days || 2,
      districts: lastTrip.districts || ['Quận 1', 'Quận 3'],
      preferences: lastTrip.preferences || [],
      transport: lastTrip.transport || 'grab',
      pace: lastTrip.pace || 'moderate',
      budget: lastTrip.budget || 3000000
    }
  };
}
```

---

## 6. Xử lý lỗi (Error Handling)

| Tình huống | Mã lỗi nội bộ | Cách xử lý |
| --- | --- | --- |
| Gemini API timeout hoặc trả về lỗi | `AI_SERVICE_TIMEOUT` | Retry tự động 1-2 lần với exponential backoff (1.5s, 3s). Nếu vẫn lỗi → trả thông báo thân thiện: "AI đang bận, vui lòng thử lại sau vài giây" |
| Gemini API hết free quota (~15 req/phút) | `AI_RATE_LIMITED` | Rate limiting phía backend (10 req/phút/IP) kết hợp gộp batch `searchPlaces` ngăn chạm trần RPM. Nếu hết quota → thông báo "Đã đạt giới hạn, vui lòng đợi 1 phút" |
| Hết slot Gemini **toàn server** (nhiều người cùng dùng chung 1 key) | `GEMINI_BUDGET_EXHAUSTED` | Thông báo: "Hệ thống đang bận, vui lòng thử lại sau vài giây". Smart Start: **hiện form thường**. Tóm tắt profile: **bỏ qua** (chạy lại ở chuyến sau) |
| Google Places API hết quota hoặc lỗi | `PLACES_FALLBACK_CACHE` | Fallback sang dữ liệu đã cache trong `places_cache` (tìm kiếm mờ bằng `ILIKE`). Thông báo user: "Một số thông tin có thể không phải mới nhất" |
| User nhập địa điểm xuất phát ngoài TP.HCM | `OUT_OF_BOUNDS_ORIGIN` | Chấp nhận + AI tính thêm thời gian di chuyển tới HCM. Hoặc validate + gợi ý: "Bạn có muốn chọn điểm xuất phát trong TP.HCM không?" |
| AI sinh lịch trình vô lý (chi phí vượt ngân sách, giờ giấc trùng nhau) | `BUDGET_OVERFLOW_WARNING` | Validation layer ở backend trong `saveItinerary` kiểm tra tổng chi phí (activities + transit) trước khi lưu DB + trả về frontend. Nếu vượt ngân sách → gắn cờ `over_budget` để Budget Bar hiện màu đỏ kèm gợi ý giảm chi phí |
| AI không gọi tool `saveItinerary` khi user yêu cầu đổi lịch trình | `MISSING_ITINERARY_TOOL` | Nếu phát hiện câu lệnh sửa lịch trình nhưng AI chỉ trả về văn bản thuần → Backend tự động nhắc lại trong vòng lặp tool với hướng dẫn: *"Please invoke `saveItinerary` to persist the updated schedule"* |
| Mất kết nối mạng khi đang thao tác lịch trình | `NETWORK_DISCONNECTED` | Conversation history và `itinerary_items` lưu trong DB theo `session_id` (khách) hoặc `user_id` (thành viên) → user refresh trang vẫn thấy lại toàn bộ lịch trình và dữ liệu đã lưu |
| Input không hợp lệ (số ngày ≤ 0, ngân sách âm, text quá dài) | `VALIDATION_ERROR` | Validate cả frontend (realtime feedback) + backend (reject 400 Bad Request). Quy tắc: ngày 1-14, ngân sách > 0, text ≤ 500 ký tự |
| Sai username hoặc mật khẩu | `AUTH_INVALID_CREDENTIALS` | `401` với **một thông báo chung** "Invalid username or password", không nói sai cái nào |
| Username hoặc email đã được dùng | `AUTH_USERNAME_TAKEN` | `409` "Username or email already in use". Form giữ nguyên dữ liệu đã nhập |
| Thử mật khẩu liên tục (brute force) | `AUTH_RATE_LIMITED` | `429` sau 5 lần sai/phút cho mỗi cặp IP + username: "Too many attempts, try again in a minute" |
| JWT hết hạn hoặc không hợp lệ | `AUTH_TOKEN_EXPIRED` | Backend coi như khách và trả header `X-Auth-Status: expired`; frontend hiện "Please sign in again". Dữ liệu thành viên **không bị mất**, chỉ ẩn cho đến khi đăng nhập lại |
| Google ID token không hợp lệ | `GOOGLE_TOKEN_INVALID` | `401`; frontend: "Google sign-in failed. Try again or use your username". Không ảnh hưởng chế độ khách |
| Link đặt lại mật khẩu hết hạn hoặc đã dùng | `RESET_TOKEN_INVALID` | `400` "This link is no longer valid. Request a new one" |
| Gửi email thất bại | `EMAIL_SEND_FAILED` | Vẫn trả `200` (không để lộ email có tồn tại hay không), ghi log; frontend nhắc "Check your inbox, or try again in a few minutes" |
| quản lý chuyến đi trong tài khoản người dùng lỗi giữa chừng | `TRIP_SAVE_FAILED` | Toàn bộ transaction **rollback**: người dùng vẫn là khách, **không mất chuyến đi nào**; hiện "Something went wrong, please try again" |
| Link chia sẻ sai hoặc đã thu hồi | `SHARE_TOKEN_INVALID` | `404` chung, không phân biệt "không tồn tại" và "đã thu hồi" |
| Smart Start không phân tích được | `ONBOARDING_PARSE_FAILED` | Hiện **form thường** như chưa có chuyện gì xảy ra; không hiện lỗi đỏ |
| Tóm tắt Travel Profile lỗi hoặc không hợp lệ | `PROFILE_DISTILL_FAILED` | Bỏ qua im lặng, giữ profile cũ, ghi log. Không ảnh hưởng người dùng |

---

---

## 7. Security

| Rủi ro | Giải thích | Cách xử lý |
| --- | --- | --- |
| SQL Injection | Raw SQL nối chuỗi trực tiếp từ input có thể bị chèn SQL độc hại | Dùng parameterized query của PostgreSQL (`pool.query("... WHERE id = $1 AND session_id = $2", [id, sessionId])`), không nối chuỗi. Điều kiện sở hữu do `ownerClause()` sinh ra chỉ ghép **số thứ tự placeholder**, không ghép dữ liệu người dùng |
| API key lộ ra frontend (bao gồm URL ảnh) | Gọi thẳng Gemini/Google Places từ React hoặc gắn `key=` vào URL ảnh Places sẽ lộ key trong DevTools | Mọi API key chỉ gọi từ backend, frontend không bao giờ gọi thẳng API ngoài. Ảnh Google Places được resolve sang URL `lh3.googleusercontent.com` hoặc đi qua `/api/places/photo/:ref` |
| Truy cập trái phép chuyến đi của người khác (IDOR) | Kẻ tấn công truyền `trip_id` bất kỳ để đọc/xóa chuyến đi của phiên hoặc tài khoản khác | Middleware `identity` + `ownerClause()`: mọi truy cập `/api/trips/:id/*` phải khớp `user_id` (thành viên) hoặc `session_id` với `user_id IS NULL` (khách). Sai quyền trả `404`, không phải `403`, để không lộ sự tồn tại |
| Không giới hạn request | Gemini free tier chỉ ~15 request/phút — dễ sập quota khi demo | Thêm rate limiting backend (`express-rate-limit`): **10 req/phút/IP** cho các route AI (`/api/v1/ai/generate`, `/api/v1/ai/swap`), **30 req/phút/IP** cho các route khác. Thêm trần **toàn server** `geminiBudget` |
| Input không kiểm tra | Số ngày âm, ngân sách sai kiểu có thể gây lỗi/crash | Validate input cả frontend lẫn backend bằng `zod` (xem mục 6) |
| CORS mở toàn bộ | Domain khác gọi được API, tốn quota miễn phí | Chỉ cho phép domain frontend thật (Vercel URL) và `http://localhost:5173` qua CORS. **v2:** `allowedHeaders: ['Content-Type', 'x-session-id', 'Authorization']` và `exposedHeaders: ['X-Auth-Status']` (thiếu cái sau thì frontend không đọc được trạng thái token hết hạn) |
| Prompt injection | User nhập text cố tình "hack" system prompt của AI | Tách rõ `systemInstruction` trong Gemini SDK vs user input; giới hạn 500 ký tự và lọc bỏ các thẻ giả mạo hệ thống. **v2:** thêm các lớp phòng thủ cho profile/persona ở mục 4.7.5 |
| Lộ mật khẩu | Lưu mật khẩu dạng rõ hoặc hash yếu; log lộ mật khẩu | `bcryptjs` cost 12, mật khẩu 8–72 ký tự; không bao giờ log body của `/api/auth/*`; không trả `password_hash` ra response |
| Dò tài khoản (user enumeration) | Kẻ tấn công đoán username/email nào tồn tại qua thông báo hoặc thời gian phản hồi | Thông báo đăng nhập **chung**; luôn chạy `bcrypt.compare` (với `DUMMY_HASH` nếu không có user) để thời gian giống nhau; `forgot-password` luôn trả `200` |
| Đoán mật khẩu (brute force) | Thử hàng loạt mật khẩu | `express-rate-limit` **5 lần/phút theo cặp IP + username** cho đăng nhập, **5 lần/giờ/IP** cho đăng ký, **3 lần/giờ** cho `forgot-password` |
| Đánh cắp JWT | Token trong `localStorage` bị XSS lấy | Không dùng `dangerouslySetInnerHTML`, CSP cơ bản, token hết hạn sau 7 ngày, payload chỉ có `sub`, `JWT_SECRET` ≥ 32 byte ngẫu nhiên trong biến môi trường. Đăng xuất xóa token **và xoay `session_id`** |
| Giả mạo đăng nhập Google | Client gửi ID token giả hoặc của ứng dụng khác | **Backend** gọi `verifyIdToken` với `audience = GOOGLE_CLIENT_ID`, kiểm tra `email_verified`; không tin bất kỳ trường nào client gửi riêng |
| Token đặt lại mật khẩu bị đánh cắp hoặc đoán | Chiếm tài khoản qua email | 32 byte ngẫu nhiên, DB chỉ lưu **SHA-256**, hết hạn 30 phút, dùng một lần, đổi mật khẩu xong thì vô hiệu mọi token cũ |
| Lộ dữ liệu qua link chia sẻ | Link chuyền tay hoặc bị lộ | Token 128-bit không đoán được, **chỉ đọc**, thu hồi được (token cũ → 404), payload lược bỏ `session_id`/`user_id`/email, `X-Robots-Tag: noindex`, rate limit 30 req/phút/IP |
| Quyền riêng tư dữ liệu | Trí nhớ AI và dữ liệu tài khoản là dữ liệu cá nhân | Chỉ lưu dữ liệu tối thiểu (không lưu SĐT), profile xem/sửa/xóa/tắt được, xóa tài khoản xóa **cascade** toàn bộ chuyến đi và profile |
| Khách lạm dụng quota Gemini | Ai cũng dùng được nên có thể spam | Rate limit theo IP + trần toàn server `geminiBudget`; tạo lịch trình luôn được ưu tiên |

**Checklist**:

- [x] `.env` + `.gitignore` — không commit API key
- [x] HTTPS tự động từ Vercel/Render
- [ ] Parameterized query (`$1, $2...`) cho mọi truy vấn SQL PostgreSQL
- [ ] Ẩn `GOOGLE_PLACES_API_KEY` khỏi URL ảnh bằng Photo Proxy / Redirect resolver
- [ ] Rate limiting ở backend (`express-rate-limit`: 10 req/phút/IP cho API AI)
- [ ] Validate input (frontend + backend) + kiểm tra `x-session-id`
- [ ] Cấu hình CORS chỉ cho domain frontend thật (kèm `Authorization` và `X-Auth-Status`)
- [ ] Prompt injection protection
- [ ] *(P1)* Link chia sẻ: token ngẫu nhiên, chỉ đọc, thu hồi được, payload lược bớt
- [ ] *(P2)* Mật khẩu hash bằng bcrypt, không log, thông báo đăng nhập chung
- [ ] *(P2)* Rate limit đăng nhập / đăng ký / quên mật khẩu
- [ ] *(P2)* `JWT_SECRET` ngẫu nhiên ≥ 32 byte, token có hạn
- [ ] *(P2)* Google ID token được **backend** xác minh
- [ ] *(P2)* Claim chạy trong transaction, `identity` + `ownerClause()` dùng cho mọi route trip
- [ ] *(P3)* `sanitizeProfile()` + trợ lý du lịch TP.HCM chuẩn mực; PROFILE bọc `<user_profile>`
