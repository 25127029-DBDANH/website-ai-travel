# 🏗️ 02. Kiến Trúc Hệ Thống, Cơ Sở Dữ Liệu, Dịch Vụ Lõi & AI

> **Phạm vi tài liệu:** Đặc tả kiến trúc backend FastAPI, lược đồ CSDL SQLAlchemy ORM, luồng AI Gemini, dịch vụ địa điểm/chuyến đi, xử lý lỗi và bảo mật — đồng bộ trực tiếp với mã nguồn trong `server/`.
> *(Đặc tả OpenAPI 3.1 chi tiết cho toàn bộ endpoint được xuất tự động tại [`docs/openapi.yaml`](./openapi.yaml)).*

## Mục lục
1. [Tổng quan Kiến trúc Hệ thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Mô hình Danh tính & Xác thực (Identity & Auth)](#2-mô-hình-danh-tính--xác-thực-identity--auth)
3. [Hợp đồng API (REST Endpoints)](#3-hợp-đồng-api-rest-endpoints)
4. [Lược đồ Cơ sở Dữ liệu (Database Schema)](#4-lược-đồ-cơ-sở-dữ-liệu-database-schema)
5. [Luồng Xử lý AI (Gemini Service)](#5-luồng-xử-lý-ai-gemini-service)
6. [Dịch vụ Địa điểm, Chuyến đi & Auto-Seed](#6-dịch-vụ-địa-điểm-chuyến-đi--auto-seed)
7. [Tính toán Di chuyển, Dự phòng & Xuất lịch (Transit / Contingency / Calendar)](#7-tính-toán-di-chuyển-dự-phòng--xuất-lịch-transit--contingency--calendar)
8. [Xử lý Lỗi (Error Handling)](#8-xử-lý-lỗi-error-handling)
9. [Bảo mật (Security)](#9-bảo-mật-security)

---

## 1. Tổng quan Kiến trúc Hệ thống

- **Backend (`server/`):** Python **FastAPI** (`server/main.py`, `server/app/`), chạy bằng `uvicorn` ở cổng `8000`, toàn bộ REST API nghiệp vụ gắn tiền tố `/api/v1` (qua `server/app/api/v1/api.py`), tài liệu tương tác tại `/docs` và `/redoc`.
- **Cơ sở dữ liệu (`server/app/db/`):** **SQLAlchemy 2.0 Async ORM**, mặc định dùng SQLite cục bộ (`sqlite+aiosqlite:///./travel.db`) và hỗ trợ PostgreSQL (`postgresql+asyncpg://...`) thông qua biến môi trường `DATABASE_URL`.
- **AI Engine (`server/app/services/gemini_service.py`):** Tích hợp **Google Gemini** qua SDK `google-genai`, model cấu hình qua biến `GEMINI_MODEL` (mặc định `gemini-3.5-flash`), sinh dữ liệu bằng **Structured Output JSON** bám sát catalog địa điểm TP.HCM cục bộ.
- **Frontend (`client/`):** React 18 + Vite + Tailwind CSS + Leaflet (dùng tile OpenStreetMap France), gọi API backend qua HTTP JSON.
- **Vòng đời khởi động (`lifespan` trong `server/main.py`):**
  1. Khởi tạo một instance `GeminiService` dùng chung trên `app.state.gemini_service`.
  2. Gọi `create_tables()` (`Base.metadata.create_all`) để đảm bảo đủ 4 bảng ORM.
  3. Kiểm tra số bản ghi bảng `places`; nếu đang rỗng thì tự động gọi `seed_places()` từ `server/app/db/hcmc_data.py` để nạp 327 địa điểm TP.HCM.
  4. Khi tắt server, giải phóng `gemini_service` và đóng `engine.dispose()`.
- **Hạ tầng triển khai & kiểm thử:** Hiện có pytest tại `server/app/tests/test_places.py`; đóng gói Docker/CI đang mở — **🚧 Đang triển khai (#9, Đăng)**.

---

## 2. Mô hình Danh tính & Xác thực (Identity & Auth)

### 2.1. Hiện trạng Xác thực JWT (`server/app/core/dependencies.py`, `security.py`)

Phụ trách: **Đỗ Nguyễn An Khang** (Backend Lead & Auth Service).

- **Cơ chế token:** Sử dụng `OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)`. Client gửi header:
  ```http
  Authorization: Bearer <JWT>
  ```
- **Ký và giải mã JWT (`server/app/core/security.py`):**
  - Thư viện `python-jose` với thuật toán `JWT_ALGORITHM = "HS256"`, khoá bí mật `JWT_SECRET`, thời hạn `JWT_EXPIRE_MINUTES = 10080` (7 ngày).
  - Payload gồm `{"sub": user.id, "exp": <utc_timestamp>}`.
  - Mật khẩu được băm bằng `bcrypt` (rounds = 12, cắt tối đa 72 byte theo chuẩn bcrypt) và kiểm tra bằng `bcrypt.checkpw`.
- **Hai FastAPI dependency trong `server/app/core/dependencies.py`:**
  - `get_current_user`: Bắt buộc phải có Bearer token hợp lệ và bản ghi `User` còn tồn tại trong DB. Thiếu token → `401` (`detail="AUTH_REQUIRED"`); token sai/hết hạn hoặc user không tồn tại → `401` (`detail="AUTH_TOKEN_EXPIRED"`).
  - `get_optional_user`: Trả về `User | None`; nếu thiếu hoặc token không hợp lệ thì trả `None` (không ném lỗi).
- **Phạm vi Auth hiện có ở backend:** Đăng ký (`username`/`password`), đăng nhập, xem hồ sơ (`/auth/me`) và xoá tài khoản (`DELETE /auth/me` yêu cầu xác nhận mật khẩu, đồng thời xoá tường minh mọi `Trip` thuộc `user.id`). Google Sign-In, quên mật khẩu và đổi mật khẩu **chưa triển khai** ở backend.

### 2.2. Chế độ Khách (`x-session-id`) & Claim Chuyến đi — 🚧 Đang triển khai (#31)

- **Quyết định thiết kế (22/11/2026):** Cho phép **khách chưa đăng nhập** tạo và chỉnh sửa chuyến đi bằng header định danh phiên `x-session-id`. Khi khách đăng ký hoặc đăng nhập, backend sẽ tự động **claim** (chuyển quyền sở hữu) toàn bộ chuyến đi gắn với `x-session-id` đó sang tài khoản thành viên mới và trả số chuyến đã gộp trong trường `claimed_trips` của `AuthResponse`.
- **Trạng thái trên nhánh `main` (🚧 #31, Khang):**
  - `AuthResponse` đã có trường `claimed_trips: int = 0` nhưng `register`/`login` hiện chưa nhận `x-session-id` nên luôn trả `0`.
  - Bảng `trips` hiện có `user_id` bắt buộc (`nullable=False`), và các endpoint `POST /api/v1/trips/`, `/trips/me`, `/trips/{trip_id}*` vẫn đang yêu cầu `Depends(get_current_user)`.
  - Hiện tại khách chưa đăng nhập mới chỉ truy cập được các endpoint công khai (`/trips/demo`, `/trips/shared/{token}`, `/places/*`, `/ai/*`).

---

## 3. Hợp đồng API (REST Endpoints)

### 3.1. Danh sách 21 Path API hiện hành (theo `docs/openapi.yaml`)

Mọi endpoint nghiệp vụ đều nằm dưới prefix `/api/v1`; riêng `/` và `/health` nằm ở root của ứng dụng FastAPI.

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Công khai | Đăng ký tài khoản mới (`username`, `password`), trả về `user`, `token` JWT và `claimed_trips` |
| `POST` | `/api/v1/auth/login` | Công khai | Đăng nhập bằng `username`/`password`, trả về `user`, `token` JWT và `claimed_trips` |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Lấy thông tin người dùng hiện tại (`UserOut`) |
| `DELETE` | `/api/v1/auth/me` | Bearer JWT | Xác nhận mật khẩu và xoá vĩnh viễn tài khoản cùng toàn bộ chuyến đi của user |
| `POST` | `/api/v1/trips/` | Bearer JWT *(🚧 #31 hỗ trợ `x-session-id`)* | Tạo và lưu chuyến đi mới kèm `itinerary_items`, tự tính `total_estimated` |
| `GET` | `/api/v1/trips/me` | Bearer JWT | Liệt kê toàn bộ chuyến đi của người dùng hiện tại, sắp xếp mới nhất trước |
| `GET` | `/api/v1/trips/demo` | Công khai | Trả lịch trình mẫu 3 ngày tại TP.HCM (chỉ đọc, không cần đăng nhập hay bản ghi DB) |
| `GET` | `/api/v1/trips/{trip_id}` | Bearer JWT | Chi tiết chuyến đi thuộc chủ sở hữu gồm `trip`, `itinerary_items` và `budget_summary` |
| `PUT` | `/api/v1/trips/{trip_id}` | Bearer JWT | Cập nhật `title`, `status`, hoặc mảng `itinerary_items` (tự tính lại `place_count` và ngân sách) |
| `DELETE` | `/api/v1/trips/{trip_id}` | Bearer JWT | Xoá chuyến đi thuộc người dùng hiện tại |
| `PATCH` | `/api/v1/trips/{trip_id}/items/{day_number}/{order_index}` | Bearer JWT | Cập nhật trạng thái một điểm dừng (`visited`, `is_accepted`, `photo_url`, `note`, ghi `checkin_time`) |
| `POST` | `/api/v1/trips/{trip_id}/clone` | Bearer JWT | Nhân bản chuyến đi của chính mình với tiêu đề tự đánh số `(1)`, `(2)`… |
| `POST` | `/api/v1/trips/{trip_id}/share` | Bearer JWT | Sinh `share_token` (128-bit URL-safe) nếu chưa có và trả `share_url` chỉ đọc |
| `DELETE` | `/api/v1/trips/{trip_id}/share` | Bearer JWT | Thu hồi liên kết chia sẻ (`share_token = None`) |
| `GET` | `/api/v1/trips/shared/{token}` | Công khai | Xem chuyến đi chia sẻ chỉ đọc; tự động lọc bỏ ngân sách, ghi chú riêng và thông tin check-in |
| `POST` | `/api/v1/trips/shared/{token}/clone` | Bearer JWT | Nhân bản chuyến đi từ link chia sẻ công khai về tài khoản hiện tại |
| `GET` | `/api/v1/places/search` | Công khai | Tìm kiếm và lọc địa điểm TP.HCM theo `q`, `district`, `category`, `is_indoor`, `limit`, `offset` |
| `GET` | `/api/v1/places/nearby` | Công khai | Tìm địa điểm lân cận theo `lat`, `lng`, `radius_km` (0.1–20 km), `category`, `is_indoor`, `limit` |
| `GET` | `/api/v1/places/photo` | Công khai | Proxy tải ảnh từ Google Places API (`name`, `max_width`), giữ `GOOGLE_PLACES_API_KEY` ở server |
| `GET` | `/api/v1/places/{place_id}` | Công khai | Chi tiết địa điểm theo UUID; khi `enrich=true` sẽ bổ sung rating/ảnh từ Google Places (cache 7 ngày) |
| `POST` | `/api/v1/ai/concept` | Công khai | Gọi Gemini đề xuất concept chuyến đi (tóm tắt, điểm nhấn, quận gợi ý, tổng quan tuyến) |
| `POST` | `/api/v1/ai/generate` | Công khai | Gọi Gemini sinh lịch trình chi tiết theo ngày dựa trên concept đã duyệt |
| `POST` | `/api/v1/ai/swap` | Công khai | Gọi Gemini đề xuất 2–3 địa điểm thay thế tương đương (Smart Swap) cho một điểm dừng |
| `GET` | `/` | Công khai | Endpoint gốc xác nhận API đang hoạt động (`status`, `app`, `version`) |
| `GET` | `/health` | Công khai | Kiểm tra sức khoẻ dịch vụ FastAPI và cấu hình kết nối CSDL |

### 3.2. Nhóm Endpoint Chưa Có trên `main` — 🚧 Đang triển khai (#8/#18)

Phụ trách: **Hạo** (PR #18 đang mở; `server/app/api/v1/api.py` đã dự phòng hook nạp `calendar.router` khi module sẵn sàng):
- **Transit / ước tính cước xe** (`/api/v1/transit/...`) — 🚧 Đang triển khai (#8/#18).
- **Contingency / phương án dự phòng thời tiết & kẹt xe** (`/api/v1/trips/{trip_id}/contingency`) — 🚧 Đang triển khai (#8/#18).
- **Calendar / xuất file `.ics` hoặc đồng bộ lịch** (`/api/v1/calendar/...` hoặc `/trips/{trip_id}/export-ics`) — 🚧 Đang triển khai (#8/#18).

---

## 4. Lược đồ Cơ sở Dữ liệu (Database Schema)

### 4.1. Cấu hình Session & Engine (`server/app/db/session.py`)

- **Mặc định phát triển cục bộ:** `DATABASE_URL = "sqlite+aiosqlite:///./travel.db"` (`connect_args={"check_same_thread": False}`).
- **Hỗ trợ PostgreSQL / Production:** Tự động chuẩn hoá tiền tố `postgres://` hoặc `postgresql://` sang driver async `postgresql+asyncpg://` với connection pool (`pool_size=10`, `max_overflow=20`, `pool_timeout=30`, `pool_recycle=1800`).
- **Quản lý giao dịch:** Dependency `get_db()` cấp `AsyncSession` cho từng request, tự `commit()` khi thành công và `rollback()` khi phát sinh ngoại lệ.

### 4.2. Chi tiết 4 Bảng ORM (`server/app/db/models.py`)

Toàn bộ lược đồ hiện gồm đúng **4 bảng** dùng chung cho cả SQLite và PostgreSQL:

#### 1) Bảng `users` *(Đỗ Nguyễn An Khang — Auth Service)*

| Cột | Kiểu SQLAlchemy | Ràng buộc / Mặc định | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `String(32)` | PK, `uuid4().hex` | Định danh người dùng (32 ký tự hex) |
| `username` | `String(60)` | `UNIQUE`, `NOT NULL`, index | Tên đăng nhập (schema kiểm tra 3–30 ký tự `[A-Za-z0-9_]`) |
| `hashed_password` | `Text` | `NOT NULL` | Chuỗi băm `bcrypt` (cost 12) |
| `full_name` | `String(120)` | Nullable | Tên hiển thị |
| `avatar_url` | `Text` | Nullable | Đường dẫn ảnh đại diện |
| `is_active` | `Boolean` | `NOT NULL`, default `True` | Trạng thái hoạt động của tài khoản |
| `created_at` | `DateTime` | `NOT NULL`, UTC now | Thời điểm tạo |
| `updated_at` | `DateTime` | `NOT NULL`, UTC now | Thời điểm cập nhật gần nhất |

#### 2) Bảng `trips` *(Đỗ Nguyễn An Khang — Trip CRUD Service)*

| Cột | Kiểu SQLAlchemy | Ràng buộc / Mặc định | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `String(32)` | PK, `uuid4().hex` | Định danh chuyến đi |
| `user_id` | `String(32)` | `NOT NULL`, index | Chủ sở hữu chuyến đi *(🚧 #31 sẽ bổ sung `session_id` và cho phép chuyến đi của khách)* |
| `title` | `String(200)` | `NOT NULL` | Tiêu đề chuyến đi |
| `days` | `Integer` | `NOT NULL`, default `1` | Số ngày (1–14 theo schema) |
| `budget` | `Integer` | `NOT NULL`, default `5000000` | Ngân sách mục tiêu (VND) |
| `total_estimated` | `Integer` | `NOT NULL`, default `0` | Tổng chi phí ước tính đã tính sẵn (VND) |
| `place_count` | `Integer` | `NOT NULL`, default `0` | Tổng số điểm dừng trong lịch trình |
| `places_per_day` | `Integer` | `NOT NULL`, default `4` | Số điểm mỗi ngày (3–6) |
| `companion` | `String(20)` | `NOT NULL`, default `"group"` | Kiểu nhóm đi (`solo`, `couple`, `friends`, `family`, `group`) |
| `member_count` | `Integer` | `NOT NULL`, default `4` | Số thành viên trong nhóm |
| `transport_mode` | `String(20)` | `NOT NULL`, default `"grab_bike"` | Phương tiện chính |
| `start_time` / `end_time` | `String(10)` | default `"08:00"` / `"21:30"` | Khung giờ bắt đầu & kết thúc trong ngày |
| `start_location` | `String(200)` | default `"Quận 1, TP. Hồ Chí Minh"` | Điểm xuất phát |
| `preferences` | `Text` | `NOT NULL`, default `"[]"` | Chuỗi JSON mảng sở thích |
| `special_notes` | `Text` | Nullable | Ghi chú đặc biệt của người dùng |
| `status` | `String(20)` | `NOT NULL`, default `"completed"` | Trạng thái chuyến đi |
| `share_token` | `String(64)` | `UNIQUE`, nullable, index | Token chia sẻ chỉ đọc (`NULL` = chưa chia sẻ) |
| `cover_photo` / `cover_place_name` | `Text` / `String(200)` | Nullable | Ảnh bìa và tên địa điểm đầu tiên cho thẻ My Trips |
| `itinerary_json` | `Text` | `NOT NULL`, default `"[]"` | **Lưu toàn bộ mảng item lịch trình dạng JSON** (ngày, thứ tự, giờ, địa điểm, toạ độ, chi phí, `transit_info`, check-in) |
| `created_at` / `updated_at` | `DateTime` | `NOT NULL`, UTC now | Dấu thời gian tạo và cập nhật |

> **Lưu ý thiết kế:** Thay vì tách bảng `itinerary_items`, toàn bộ các chặng của chuyến đi được lưu tập trung dưới dạng mảng JSON trong cột `trips.itinerary_json` để tương thích đồng nhất giữa SQLite và PostgreSQL. Do ORM hiện không khai báo FK cascade giữa `users` và `trips`, endpoint `DELETE /api/v1/auth/me` chủ động xoá các bản ghi `Trip` theo `user_id` trước khi xoá `User`.

#### 3) Bảng `places` *(Ngô Tấn Đạt — Places & Interactive Map)*

| Cột | Kiểu SQLAlchemy | Ràng buộc / Mặc định | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `String(36)` | PK, UUID chuẩn | Định danh địa điểm |
| `name` / `name_vi` | `String(200)` | `name` `NOT NULL`, `name_vi` nullable | Tên địa điểm (tiếng Anh / tiếng Việt) |
| `address` | `Text` | `NOT NULL` | Địa chỉ chi tiết |
| `district` | `String(60)` | `NOT NULL`, index | Quận/huyện (vd: `"Quận 1"`, `"TP. Thủ Đức"`) |
| `latitude` / `longitude` | `Float` | `NOT NULL` | Toạ độ GPS dùng cho bản đồ Leaflet và Haversine |
| `category` | `String(60)` | `NOT NULL`, index | `attraction`, `food`, `cafe`, `culture`, `shopping`, `park`, `entertainment` |
| `is_indoor` | `Boolean` | `NOT NULL`, default `False`, index | `True`: trong nhà; `False`: ngoài trời |
| `open_time` / `close_time` | `String(10)` | Nullable | Giờ mở/đóng cửa dạng `HH:MM` |
| `entry_fee_vnd` | `Integer` | `NOT NULL`, default `0` | Chi phí vé/ăn uống ước tính (VND) |
| `average_rating` | `Float` | Nullable | Điểm đánh giá trung bình (AI lọc `>= 4.0`) |
| `google_place_id` | `String(100)` | Nullable | ID liên kết Google Places API (New) để enrich |
| `photo_url` / `description` | `Text` | Nullable | Ảnh minh hoạ và mô tả ngắn |
| `tags` | `Text` | default `"[]"` | Chuỗi JSON mảng thẻ mô tả |
| `is_active` | `Boolean` | `NOT NULL`, default `True` | Cờ ẩn/hiện địa điểm |
| `created_at` | `DateTime` | default UTC now | Thời điểm tạo bản ghi |

#### 4) Bảng `places_cache` *(Ngô Tấn Đạt — 7-day TTL Cache)*

| Cột | Kiểu SQLAlchemy | Ràng buộc / Mặc định | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `String(36)` | PK, UUID chuẩn | Định danh bản ghi cache |
| `place_id` | `String(100)` | `UNIQUE`, `NOT NULL`, index | Lưu `google_place_id` làm khoá tra cứu |
| `data_json` | `Text` | `NOT NULL` | Payload JSON thô nhận từ Google Places API (New) |
| `cached_at` | `DateTime` | `NOT NULL`, UTC now | Thời điểm lưu cache |
| `expires_at` | `DateTime` | `NOT NULL` | Thời điểm hết hạn (mặc định `cached_at + 7 ngày`) |

---

## 5. Luồng Xử lý AI (Gemini Service)

Phụ trách: **Lê Hữu Lam** (`server/app/services/gemini_service.py`, `server/app/api/v1/endpoints/ai.py`, `server/app/schemas/ai.py`).

### 5.1. Kiến trúc Gọi Model & Structured Output JSON

Hệ thống **không dùng Tool Calling** mà dùng cơ chế **Structured Output JSON** của SDK `google-genai`:

1. `server/main.py` khởi tạo một singleton `GeminiService(api_key=GEMINI_API_KEY, model=GEMINI_MODEL)` (mặc định `gemini-3.5-flash`) đặt tại `app.state.gemini_service`.
2. Để bảo vệ quota chung, `GeminiService` áp dụng điều tiết nội bộ:
   - `asyncio.Semaphore(max_concurrent_requests=2)` giới hạn tối đa 2 request đồng thời.
   - Sliding window `_wait_for_rate_slot()` giới hạn mặc định `requests_per_minute=15`.
3. Mỗi lần gọi, `_generate()` chạy `self._client.models.generate_content(...)` bên trong `asyncio.to_thread` với cấu hình:
   - `temperature = 0.4`
   - `response_mime_type = "application/json"`
   - `response_json_schema = _model_schema(response_model)` (JSON Schema xuất trực tiếp từ Pydantic model đích).
4. Cấu trúc prompt gồm: `SYSTEM_INSTRUCTION` (*HCMC Travel Expert* — chuyên gia du lịch TP.HCM thực tế, không dùng persona/tone), một ví dụ few-shot sinh động từ catalog địa điểm, JSON yêu cầu của người dùng, danh sách địa điểm đã kiểm chứng (`VERIFIED PLACE CATALOG`) và luật cụ thể của từng tác vụ.
5. Phản hồi chuỗi JSON được kiểm chứng ngay bằng Pydantic (`model_validate_json`).

### 5.2. Ba Tác vụ AI Chính

| Tác vụ | Endpoint & Method | Input Schema | Output Schema | Mục đích |
| :--- | :--- | :--- | :--- | :--- |
| **1. Đề xuất Concept** | `POST /api/v1/ai/concept` (`suggest_concept`) | `TripConceptRequest` | `ConceptResponse` | Đề xuất tóm tắt, điểm nổi bật, các quận phù hợp, tổng quan tuyến và câu hỏi xác nhận trước khi lập lịch chi tiết |
| **2. Sinh Lịch trình** | `POST /api/v1/ai/generate` (`generate_itinerary`) | `TripGenerationRequest` (kèm `approved_concept`) | `TripGenerationResponse` | Sinh đủ `days × places_per_day` điểm dừng theo khung giờ, gom cụm theo quận, khớp bữa trưa và ngân sách; đặt `transit_info = None` để tầng transit điền sau |
| **3. Đổi Địa điểm (Smart Swap)** | `POST /api/v1/ai/swap` (`suggest_swaps`) | `SmartSwapRequest` (`current_item`, `reason`) | `SmartSwapResponse` | Gợi ý 2–3 địa điểm thay thế tương đương cùng quận, cùng loại hình, chi phí tương đương kèm lý do thay thế |

> **🚧 Đang triển khai (#25):** Form tạo lịch trình trên frontend hiện chưa đấu nối trực tiếp tới luồng `/api/v1/ai/concept` → `/api/v1/ai/generate`.

### 5.3. Grounding vào Catalog, Retry Backoff & Fallback Cục bộ

- **Chuẩn bị Catalog (`_load_catalog` trong `ai.py`):** Truy vấn tối đa 400 địa điểm đang hoạt động từ `places_service.search_places`, chuẩn hoá nhóm loại hình (`attraction`/`culture` → `sightseeing`, `park` → `nature`) và chỉ giữ địa điểm có `editorial_score >= 4.0`. Riêng `/ai/swap` lọc trước theo quận của `current_item`.
- **Kiểm chứng & Grounding chống bịa đặt (Anti-Hallucination):**
  - `_ground_concept`: Chuẩn hoá và lọc `recommended_districts` phải có trong catalog; nếu rỗng sẽ ném `ValueError`.
  - `_ground_itinerary`: Kiểm tra đúng tổng số điểm `days × places_per_day`, mọi `place_id` phải tồn tại trong catalog, không trùng `(day_number, order_index)`, đúng biên ngày/thứ tự; **ghi đè toàn bộ metadata địa điểm** (tên, địa chỉ, toạ độ, giá, ảnh, giờ mở cửa…) từ bản ghi chuẩn trong catalog và ép `transit_info = None`.
  - `_ground_swaps`: Xác minh từng gợi ý khác `current_item.place_id`, không trùng nhau, cùng quận (đã bỏ tiền tố `"TP. "`), cùng `category`, chênh lệch chi phí `<= max(50_000, 50% estimated_cost)`.
- **Retry có Exponential Backoff:** Với các lỗi tạm thời (HTTP `408, 429, 500, 502, 503, 504`, `TimeoutError`, `ConnectionError`, `OSError`, `DeadlineExceeded`, `ResourceExhausted`, `ServiceUnavailable`, `TooManyRequests`…), `_generate()` thử lại tối đa `max_attempts = 3` với độ trễ `0.75s × 2^(attempt - 1)` nhân jitter ngẫu nhiên `[0.8, 1.2]`.
- **Fallback cục bộ xác định:** Nếu chưa cấu hình `GEMINI_API_KEY`, hết lượt retry, lỗi không retry được, hoặc đầu ra AI không qua được bước grounding, dịch vụ tự động gọi `_fallback_concept` / `_fallback_itinerary` / `_fallback_swaps` để chọn trực tiếp từ catalog `places` (chỉ ném `GeminiServiceError` → HTTP `503` khi catalog không đủ điểm).
- **⚠️ Lưu ý lỗi bị nuốt im lặng — 🚧 Đang triển khai (#23):** Hiện tại mọi lỗi gọi Gemini hay lỗi grounding đều bị bắt và âm thầm trả về kết quả fallback cục bộ với HTTP `200` (chỉ ghi `logger.warning`, không gắn cờ phân biệt trong JSON response). Cần bổ sung log/chỉ báo rõ nguồn kết quả (`ai` vs `fallback`) hoặc xử lý lỗi minh bạch theo issue #23.

---

## 6. Dịch vụ Địa điểm, Chuyến đi & Auto-Seed

### 6.1. Dịch vụ Địa điểm & Cache 7 ngày (`server/app/services/places_service.py`)

Phụ trách: **Ngô Tấn Đạt** (Places & Interactive Map).

- **100% SQLAlchemy Async ORM** (tương thích SQLite & PostgreSQL):
  - `search_places`: Lọc `Place.is_active == True`, tìm kiếm từ khoá `q` bằng `ilike` trên `name`, `name_vi`, `address`, `tags`, `description`; lọc chính xác `district`, `category`, `is_indoor`; sắp xếp `average_rating DESC` với biểu thức `CASE` giả lập `NULLS LAST` chạy được trên cả SQLite lẫn PostgreSQL.
  - `get_nearby_places`: Lọc thô bằng bounding-box (`latitude.between`, `longitude.between`) trên DB rồi tính khoảng cách chính xác bằng công thức Haversine trong Python (có kẹp giá trị `a` vào `[0.0, 1.0]` tránh lỗi `math domain error`), trả về tối đa `limit` điểm kèm `distance_km` tăng dần.
  - `get_place_by_id`: Lấy bản ghi cục bộ; nếu `enrich_from_google=True` và có `google_place_id`, tra cứu bảng `places_cache` (TTL 7 ngày). Khi cache miss/hết hạn và có `GOOGLE_PLACES_API_KEY`, gọi `GET https://places.googleapis.com/v1/places/{google_place_id}` (timeout 5s) để làm mới `average_rating` và gắn ảnh qua proxy `/api/v1/places/photo?name=...`. Nếu API Google lỗi hoặc thiếu key, fallback về bản cache cũ (nếu có) hoặc giữ nguyên dữ liệu cục bộ.

### 6.2. Dịch vụ Quản lý Chuyến đi (`server/app/api/v1/endpoints/trips.py`)

Phụ trách: **Đỗ Nguyễn An Khang** (Auth & Trip CRUD).

- **Quyền sở hữu:** Mọi thao tác đọc/sửa/xoá/clone/share theo `trip_id` đi qua `_get_user_trip(trip_id, user, db)` lọc `Trip.id == trip_id AND Trip.user_id == user.id` (không khớp trả `404 NOT_FOUND`).
- **Tính toán ngân sách (`_compute_budget`):**
  - `activities_cost = sum(item.estimated_cost) × member_count`.
  - `transit_cost`: cộng `estimated_fare_vnd` của từng chặng (nhân `member_count` nếu `mode == "grab_bike"`) + phụ phí `5,000 VND × số điểm`.
  - Phân loại trạng thái `health`: `over_budget` (`> 100%`), `near_budget` (`> 85%`), còn lại `under_budget`.
- **Chia sẻ công khai an toàn (`_public_items`):** Khi trả `GET /api/v1/trips/shared/{token}` hoặc `POST /shared/{token}/clone`, lọc đệ quy các khoá nhạy cảm (`user`, `session`, `email`, `phone`, `checkin`, `cost`, `budget`, `expense`, `private`, `note`, `notes`) và đặt `budget = 0`, `total_estimated = 0`, `special_notes = None` trên trang chia sẻ.
- **Lịch trình mẫu (`GET /api/v1/trips/demo`):** Sinh trực tiếp lịch trình 3 ngày (12 điểm tại Quận 1, Quận 3, Phú Nhuận) trong bộ nhớ, chỉ đọc, không phụ thuộc DB hay tài khoản.

### 6.3. Tự động nạp Catalog 327 Địa điểm (`server/app/db/hcmc_data.py`)

Phụ trách: **Ngô Tấn Đạt**.

- Khi backend khởi động (`lifespan` trong `server/main.py`), nếu bảng `places` có 0 bản ghi, hệ thống tự động gọi `await seed_places()` để nạp **327 địa điểm thực tế tại TP.HCM** phủ 8 khu vực (Quận 1, Quận 3, Quận 4, Quận 5, Bình Thạnh, Phú Nhuận, TP. Thủ Đức, Quận 7) với ảnh mặc định theo từng loại hình.
- Có thể chạy thủ công bằng `python -m app.db.hcmc_data` trong thư mục `server/`.

---

## 7. Tính toán Di chuyển, Dự phòng & Xuất lịch (Transit / Contingency / Calendar)

- **Trạng thái hiện tại:** **🚧 Đang triển khai (#8/#18, Hạo)**.
- File `server/app/utils/transit_calculator.py` trên nhánh `main` hiện đang **rỗng (0 byte)**; các endpoint contingency và xuất lịch (`.ics` / Google Calendar) chưa được hợp nhất vào `main` (đang mở ở PR #18).
- Hiện tại `GeminiService.generate_itinerary` luôn để `transit_info = None` để module `transit_calculator.py` bổ sung khoảng cách, thời gian và ước tính cước xe sau khi PR #18 được hợp nhất.

---

## 8. Xử lý Lỗi (Error Handling)

FastAPI trả lỗi theo 3 dạng chuẩn:

1. **Lỗi nghiệp vụ (`HTTPException`):** JSON dạng `{"detail": "<MÃ_LỖI_HOẶC_THÔNG_BÁO>"}`.
2. **Lỗi kiểm tra dữ liệu đầu vào (Pydantic v2 / Query validation):** HTTP `422 Unprocessable Entity` với danh sách chi tiết trường sai trong `{"detail": [...]}`.
3. **Lỗi hệ thống không bắt được (`global_exception_handler` trong `server/main.py`):** HTTP `500 Internal Server Error` với `{"detail": "INTERNAL_ERROR", "message": "An unexpected error occurred."}`.

| Tình huống | HTTP Status | `detail` / Hành vi thực tế trong code |
| :--- | :---: | :--- |
| Thiếu header `Authorization: Bearer` ở route yêu cầu đăng nhập | `401` | `"AUTH_REQUIRED"` (kèm header `WWW-Authenticate: Bearer`) |
| Token JWT sai chữ ký, hết hạn hoặc `user_id` không còn trong DB | `401` | `"AUTH_TOKEN_EXPIRED"` |
| Sai `username` hoặc `password` khi đăng nhập | `401` | `"AUTH_INVALID_CREDENTIALS"` (thông báo chung, không phân biệt sai trường nào) |
| Đăng ký trùng `username` đã tồn tại | `409` | `"AUTH_USERNAME_TAKEN"` |
| Xác nhận sai mật khẩu khi gọi `DELETE /api/v1/auth/me` | `403` | `"AUTH_PASSWORD_INVALID"` |
| `trip_id` không tồn tại hoặc không thuộc `user_id` hiện tại | `404` | `"NOT_FOUND"` |
| Không tìm thấy điểm `(day_number, order_index)` khi `PATCH` item | `404` | `"TRIP_ITEM_NOT_FOUND"` |
| `share_token` không tồn tại hoặc đã bị thu hồi | `404` | `"SHARE_TOKEN_INVALID"` |
| `place_id` không tồn tại trong bảng `places` | `404` | `"Không tìm thấy địa điểm với id=..."` |
| Dữ liệu request sai định dạng/ràng buộc (`days`, `budget`, `username`, `password`, query params…) | `422` | `HTTPValidationError` chuẩn của FastAPI/Pydantic |
| Chưa cấu hình `GOOGLE_PLACES_API_KEY` khi gọi `/places/photo` | `503` | `"Google Places API key chưa được cấu hình."` |
| Lỗi kết nối hoặc phản hồi lỗi từ Google Places khi proxy ảnh | `502` | `"Không thể tải ảnh từ Google Places API."` / `"Lỗi kết nối Google Places: ..."` |
| `gemini_service` chưa sẵn sàng hoặc catalog không đủ điểm hợp lệ | `503` | `"AI service is not configured."` / `"No verified places..."` / `"AI could not create a result..."` |
| Gemini API lỗi tạm thời (`429`/`5xx`/timeout) hoặc trả JSON sai grounding | `200` *(fallback)* | Retry tối đa 3 lần có backoff + jitter, sau đó rơi về fallback cục bộ *(🚧 #23: lỗi đang bị nuốt im lặng, cần làm minh bạch)* |
| Ngoại lệ không dự kiến phía server | `500` | `{"detail": "INTERNAL_ERROR", "message": "An unexpected error occurred."}` |

---

## 9. Bảo mật (Security)

| Biện pháp / Rủi ro | Hiện trạng triển khai trong FastAPI |
| :--- | :--- |
| **Chống SQL Injection** | Toàn bộ truy vấn dùng SQLAlchemy 2.0 ORM tham số hoá (`select`, `where`, `ilike`), không ghép chuỗi SQL thô. |
| **Băm mật khẩu & JWT** | `bcrypt` trực tiếp trong `security.py` (rounds = 12, giới hạn 72 byte; gói `passlib[bcrypt]` cũng có trong `requirements.txt`). Không trả `hashed_password` qua `UserOut`. JWT ký `HS256` bằng `python-jose` với `JWT_SECRET` từ `server/.env` và hạn `JWT_EXPIRE_MINUTES` (mặc định 7 ngày). |
| **Chống truy cập trái phép (IDOR)** | `_get_user_trip` ràng buộc cả `Trip.id` và `Trip.user_id == user.id`, trả `404 NOT_FOUND` để không lộ sự tồn tại chuyến đi của người khác. *(🚧 #31 sẽ bổ sung kiểm tra sở hữu theo `x-session-id` cho khách).* |
| **Giữ API Key phía server** | `GEMINI_API_KEY` và `GOOGLE_PLACES_API_KEY` chỉ lưu trong `server/.env` (bị `.gitignore`, không commit). Ảnh Google Places đi qua proxy `GET /api/v1/places/photo`, không bao giờ lộ key ra trình duyệt. |
| **Kiểm soát CORS** | `CORSMiddleware` đọc danh sách origin hợp lệ từ biến môi trường `CORS_ORIGINS` (hoặc `FRONTEND_ORIGINS`), mặc định chỉ mở cho `localhost:5173`, `localhost:3000`, `127.0.0.1:5173`, `127.0.0.1:3000`. |
| **Kiểm tra dữ liệu đầu vào** | Validate chặt bằng Pydantic v2 schemas (`UserCreate`, `TripCreate`, `TripConceptRequest`…) và `Query` constraints của FastAPI → tự từ chối bằng HTTP `422`. |
| **An toàn link chia sẻ** | Token ngẫu nhiên `secrets.token_urlsafe(16)` (128-bit), chỉ đọc, thu hồi được bằng `DELETE /share`, tự động loại bỏ ngân sách và dữ liệu riêng tư qua `_public_items()`. |
| **Chống Prompt Injection & Hallucination** | Tách `SYSTEM_INSTRUCTION`, giới hạn `special_notes <= 500` ký tự, bắt buộc Structured Output JSON và ghi đè lại toàn bộ thuộc tính địa điểm từ catalog `places` đã kiểm chứng. |
| **Giới hạn tần suất (Rate Limiting HTTP)** | **🚧 Chưa có** middleware rate limit theo IP cho các endpoint HTTP (auth, AI, share). Hiện mới có giới hạn nội bộ theo phút (`15 req/phút`) và `Semaphore(2)` trong `GeminiService`. |

### Checklist Bảo mật Hiện tại

- [x] Lưu cấu hình bí mật trong `server/.env` (có `server/.env.example`, không commit secret).
- [x] Truy vấn 100% qua SQLAlchemy ORM tham số hoá.
- [x] Mật khẩu băm `bcrypt` (cost 12), thông báo đăng nhập sai dạng chung (`AUTH_INVALID_CREDENTIALS`).
- [x] Proxy ảnh Google Places qua `GET /api/v1/places/photo`, không lộ `GOOGLE_PLACES_API_KEY`.
- [x] Validate input bằng Pydantic v2 (HTTP `422`).
- [x] Cấu hình `CORSMiddleware` theo `CORS_ORIGINS`.
- [x] Link chia sẻ token 128-bit chỉ đọc, thu hồi được, ẩn thông tin ngân sách và check-in.
- [x] Grounding đầu ra Gemini vào catalog `places` cục bộ.
- [ ] **🚧 Chưa có:** Rate limiting HTTP theo IP (bảo vệ brute-force `/auth/login`, spam `/ai/*` và `/trips/shared/*`).
- [ ] **🚧 Chưa có:** Thay `JWT_SECRET` mặc định (`change-me-to-a-random-string`) bằng chuỗi ngẫu nhiên mạnh trên môi trường deploy.
- [ ] **🚧 Đang triển khai (#31):** Hỗ trợ phiên khách `x-session-id` và claim chuyến đi an toàn trong transaction.
