# 🚀 04. Kiểm Thử, Triển Khai, Quản Trị Rủi Ro & Kịch Bản Demo Bảo Vệ


## Mục lục
- 1. Chiến lược & Kịch bản Kiểm thử (Testing)
- 2. Hướng dẫn Đóng gói & Triển khai (Deploy)
- 3. Quản trị Rủi ro (Risks)
- 4. Kịch bản Live Demo 5 Phút & Câu hỏi Phản biện (Q&A)
- 5. Checklist Nộp bài & Thuyết trình

---

## 8. Testing

### 8.1. Chiến lược Testing tổng quan

| Loại test | Công cụ | Mục tiêu | Ví dụ test case |
| --- | --- | --- | --- |
| Unit / Integration test (Backend) | **`pytest`** (`server/app/tests/`) | Kiểm thử tự động dữ liệu 327 địa điểm, cache TTL, Haversine, Auth, CRUD Trips, AI schema và Calendar. Hiện đã có `server/app/tests/test_places.py`; mở rộng phần còn lại (**🚧 Đang triển khai (#9)**) | Đủ 327 địa điểm trên 8 quận, `PlaceCache` TTL 7 ngày, route `/places/photo` không bị che bởi `/{place_id}`, validate input, hash mật khẩu bcrypt, tính ngân sách |
| Unit test (Frontend) | **`node --test`** (`cd client && npm test`) | Kiểm thử logic frontend và tính nhất quán đa ngôn ngữ VI/EN (`client/test/translations.test.js`) | Khớp 100% key và biến nội suy `{...}` giữa tiếng Việt và tiếng Anh |
| API test | Swagger UI (`/docs`) / Postman / Thunder Client | Kiểm thử từng endpoint dưới prefix `/api/v1` | `POST /api/v1/trips/` hợp lệ → `201`, thiếu trường → `422`, trip không tồn tại → `404`; đăng ký trùng username → `409 AUTH_USERNAME_TAKEN` |
| E2E / Manual test | Trình duyệt | Kiểm thử toàn bộ luồng người dùng | Khách mở `/trip/demo` công khai; tạo chuyến → đăng ký → claim chuyến (**🚧 #31**); đổi điểm AI; check-in & xuất Story Card; chia sẻ `/s/:token` và thu hồi |
| Responsive test | Chrome DevTools | Kiểm tra giao diện trên nhiều kích thước màn hình | iPhone SE (375px), iPad (768px), Desktop (1280px) |

**Lệnh chạy test hiện có:**
```bash
# Backend (từ thư mục server, sau khi đã cài dependencies vào .venv)
cd server && .venv/bin/pytest app/tests/test_places.py

# Frontend
cd client && npm test
```

### 8.2. Danh sách Test Cases chi tiết (Test Matrix)

#### Nhóm lõi (P0): 10 test trọng tâm

| ID | Phân loại | Tên Test Case | Input đầu vào | Kết quả kỳ vọng (Expected Output) |
| --- | --- | --- | --- | --- |
| `TC-01` | Unit Test *(🚧 #8/#18)* | Tính khoảng cách đi bộ gần (< 800m) | Tọa độ Dinh Độc Lập `(10.7769, 106.6953)` → Nhà thờ Đức Bà `(10.7798, 106.6990)` | `mode: "walk"`, `distance_km <= 0.8`, `estimated_fare_vnd: 0` |
| `TC-02` | Unit Test *(🚧 #8/#18)* | Tính khoảng cách & cước xe (≥ 800m) | Tọa độ Chợ Bến Thành `(10.7725, 106.6980)` → Chợ Bình Tây Q.6 `(10.7495, 106.6510)` | `distance_km > 5.0`, ước tính cước Grab / Xanh SM / Be hợp lý theo biểu giá |
| `TC-03` | API Test | Validate tạo chuyến đi sai số ngày | `POST /api/v1/trips/` với `days: 0` hoặc vượt giới hạn | FastAPI/Pydantic trả về `HTTP 422 Unprocessable Entity` |
| `TC-04` | Unit Test | Tính tổng ngân sách & cảnh báo vượt mức | `budget: 1000000`, tổng `estimated_cost` + `transit_cost` > `1000000` | `_compute_budget` trả `total_estimated > 1000000`, `percentage > 100`, `health: "over_budget"` |
| `TC-05` | API Test | Phân tách quyền sở hữu chuyến đi | Người dùng B gọi `GET /api/v1/trips/{trip_id}` thuộc người dùng A (và tương tự với phiên khách `x-session-id` — **🚧 #31**) | Trả về `HTTP 404 Not Found` (không làm lộ dữ liệu của người dùng A) |
| `TC-06` | Unit / Integration | Seed 327 địa điểm & Cache Hit `places_cache` | Chạy `GET /api/v1/places/search?q=...` và `pytest app/tests/test_places.py` | Đủ 327 địa điểm trên 8 quận, đủ `photo_url` & tọa độ; bản ghi `places_cache` còn hạn TTL 7 ngày trả trực tiếp từ DB không gọi Google Places |
| `TC-07` | Integration | Ẩn API Key trong URL ảnh địa điểm | Kiểm tra `photo_url` từ `/api/v1/places/search`, `/api/v1/places/{place_id}` và endpoint proxy `/api/v1/places/photo` | URL ảnh không bao giờ chứa chuỗi khóa `AIza...`; route `/places/photo` không bị `/{place_id}` bắt nhầm (đã có regression test trong `test_places.py`) |
| `TC-08` | E2E AI Flow | Đề xuất concept & sinh lịch trình bằng Gemini | Gửi `POST /api/v1/ai/concept` và `POST /api/v1/ai/generate` với tiêu chí hợp lệ | Trả về JSON đúng Pydantic schema (`ConceptResponse` / `TripGenerationResponse`), chỉ dùng địa điểm từ catalog local TP.HCM *(nối trực tiếp từ `TripForm.jsx`: 🚧 Đang triển khai (#25))* |
| `TC-09` | E2E AI Flow | Đổi địa điểm thông minh (AI Smart Swap) | Gọi `POST /api/v1/ai/swap` rồi cập nhật chặng qua `PATCH /api/v1/trips/{trip_id}/items/{day_number}/{order_index}` | Đề xuất 2–3 địa điểm thay thế cùng quận/ngân sách; cập nhật đúng chặng được chọn, giữ nguyên các chặng khác và tính lại `budget_summary` |
| `TC-10` | Resilience | Fallback cục bộ & báo lỗi minh bạch khi Gemini lỗi | Gọi `/api/v1/ai/generate` khi thiếu/hết quota `GEMINI_API_KEY` | Dịch vụ `gemini_service.py` rơi về fallback cục bộ hợp lệ trên catalog local; hiển thị thông báo rõ lỗi Gemini thay vì nuốt im lặng (**🚧 Đang triển khai (#23)**) |

#### Nhóm mở rộng (Auth, Share, Claim & Frontend i18n)

| ID | Tier | Phân loại | Tên Test Case | Input đầu vào | Kết quả kỳ vọng |
| --- | --- | --- | --- | --- | --- |
| `TC-11` | P1 | API Test *(🚧 Đang triển khai (#31))* | My Trips chỉ trả chuyến của mình | Khách A (`x-session-id` A) tạo 2 chuyến, khách B (`x-session-id` B) tạo 1 chuyến; A gọi `GET /api/v1/trips/me` *(tương tự với thành viên đã đăng nhập)* | Trả đúng 2 chuyến của A, không lẫn chuyến của B |
| `TC-12` | P1 | API Test | Link chia sẻ chỉ đọc, ẩn dữ liệu nội bộ | Gọi `POST /api/v1/trips/{trip_id}/share`, sau đó gọi `GET /api/v1/trips/shared/{token}` không kèm header xác thực | `200`, payload đã qua `_public_items()` **không** chứa `user`, `session`, `email`, `phone`, `checkin`, `cost`, `budget`, `expense`, `note`; không thể `PUT`/`DELETE` qua token chia sẻ |
| `TC-13` | P1 | API Test | Thu hồi link chia sẻ | Gọi `DELETE /api/v1/trips/{trip_id}/share` rồi gọi lại `GET /api/v1/trips/shared/{token}` | `404` (giống token không tồn tại) |
| `TC-14` | P2 | Unit / API Test | Mật khẩu được hash bằng bcrypt | `POST /api/v1/auth/register` với mật khẩu hợp lệ | Cột `hashed_password` trong bảng `users` bắt đầu bằng `$2` (bcrypt), không lưu plaintext; `verify_password` đúng → `True`, sai → `False` |
| `TC-15` | P2 | API Test | Trùng username khi đăng ký | Đăng ký `POST /api/v1/auth/register` cùng một `username` 2 lần | Lần 2 trả `409` với `detail: "AUTH_USERNAME_TAKEN"` |
| `TC-16` | P2 | Integration *(🚧 Đang triển khai (#31))* | **Claim giữ nguyên chuyến của khách** | Khách (header `x-session-id: S`) tạo 2 chuyến qua `POST /api/v1/trips/` → gọi `POST /api/v1/auth/register` hoặc `/login` kèm cùng `x-session-id: S` | Response có `claimed_trips: 2`; `GET /api/v1/trips/me` (đã đăng nhập) trả đủ 2 chuyến đã gán `user_id` mới |
| `TC-17` | P2 | API Test *(🚧 Đang triển khai (#31))* | IDOR giữa các thành viên và sau claim | Thành viên B dùng JWT của mình gọi `GET /api/v1/trips/{trip_id}` của thành viên A; khách dùng `x-session-id` cũ gọi chuyến **đã claim** | Cả hai đều trả `404` |
| `TC-18` | P2 | API Test | Xóa tài khoản & toàn bộ chuyến đi | Gọi `DELETE /api/v1/auth/me` với mật khẩu sai, rồi gọi lại với mật khẩu đúng | Mật khẩu sai → `403 AUTH_PASSWORD_INVALID`; mật khẩu đúng → `200 { "success": true }`, toàn bộ `trips` của user bị xóa sạch |
| `TC-19` | FE | Unit Test | Tính nhất quán từ điển song ngữ VI/EN | Chạy `cd client && npm test` (`node --test test/translations.test.js`) | Pass toàn bộ: khớp 100% khóa dịch và placeholder `{...}` giữa `vi` và `en` |

---

## 9. Deploy

| Thành phần | Nền tảng | Chi tiết |
| --- | --- | --- |
| Frontend | **Vercel** (free) | React 18 + Vite + Tailwind + Leaflet (tile bản đồ OpenStreetMap France do DNS VNPT chặn `tile.openstreetmap.org`). Auto deploy từ nhánh `main`; cấu hình SPA rewrite về `index.html` để `/trips`, `/trip/:id`, `/s/:token`, `/settings` không bị 404 khi tải lại trang |
| Backend | **Render** (free tier) | Python 3.11–3.13 + FastAPI + Uvicorn (cổng `8000` local hoặc biến `PORT` do Render cấp). **Lưu ý**: Free Tier tự sleep sau 15 phút không có request |
| Database (local) | **SQLite** (mặc định) | `sqlite+aiosqlite:///./travel.db` — tự tạo 4 bảng ORM (`users`, `trips`, `places`, `places_cache`) và tự seed 327 địa điểm TP.HCM từ `server/app/db/hcmc_data.py` ngay khi khởi động |
| Database (prod) | **Supabase PostgreSQL** (free tier) | Kết nối bằng `DATABASE_URL` dạng `postgresql+asyncpg://...`, dùng chung 4 model SQLAlchemy Async ORM trong `server/app/db/models.py` |

### 9.1. Environment Variables cần thiết lập

Tham chiếu trực tiếp từ `server/.env.example`, `server/app/core/config.py`, `server/main.py` và `client/src/`:

**Backend (FastAPI — Render / `server/.env`):**
```env
PORT=8000

# Local mặc định (SQLite):
DATABASE_URL=sqlite+aiosqlite:///./travel.db
# Production (PostgreSQL / Supabase):
# DATABASE_URL=postgresql+asyncpg://postgres:[password]@[host]:5432/postgres

# JWT Auth (HS256)
JWT_SECRET=replace-with-a-strong-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

# CORS (danh sách origin frontend cách nhau bằng dấu phẩy)
CORS_ORIGINS=https://your-app.vercel.app

# Google Gemini API (google-genai)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Google Places API New (tuỳ chọn — bỏ trống vẫn chạy với 327 địa điểm local)
GOOGLE_PLACES_API_KEY=
```

**Frontend (Vite — Vercel / `client/.env`):**
```env
VITE_API_BASE=https://your-api.onrender.com

# Tuỳ chọn: mặc định dùng tile OpenStreetMap France
# VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png
```

> [!CAUTION]
> Tuyệt đối **không commit** `server/.env` và không đưa `JWT_SECRET`, `GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `DATABASE_URL` lên cấu hình Frontend (Vercel).

### 9.2. Quy trình deploy

```
1. Push mã nguồn đã kiểm thử lên nhánh main trên GitHub
2. Tạo Web Service trên Render trỏ tới thư mục `server/`:
   - Build command : pip install -r requirements.txt
   - Start command : uvicorn main:app --host 0.0.0.0 --port $PORT
   - Cấu hình đủ Environment Variables ở mục 9.1 (đặt DATABASE_URL trỏ tới Supabase PostgreSQL nếu dùng DB cloud)
3. Khi backend khởi động lần đầu, `lifespan` trong `server/main.py` tự động gọi `create_tables()` tạo 4 bảng ORM và tự seed 327 địa điểm TP.HCM từ `server/app/db/hcmc_data.py`
4. Kiểm tra `GET https://<render-url>/health` trả `{"status": "healthy", ...}` và `GET /api/v1/places/search` trả dữ liệu
5. Deploy thư mục `client/` lên Vercel, cấu hình `VITE_API_BASE=https://<render-url>`
6. Cập nhật `CORS_ORIGINS` trên Render khớp với domain Vercel vừa triển khai
7. Test end-to-end: mở `/trip/demo`, tạo/xem chuyến, chia sẻ `/s/:token`, đăng ký & đăng nhập (và luồng claim khi `#31` hoàn tất)
```

### 9.3. Cấu hình Docker & Docker Compose — 🚧 Đang triển khai (#9)

> [!NOTE]
> **🚧 Đang triển khai (#9):** File `docker-compose.yml` ở thư mục gốc hiện đang trống (0 byte) và nhóm chưa hoàn thiện `server/Dockerfile`, `client/Dockerfile`.
>
> Trong thời gian hoàn thiện `#9`, để chạy local hoặc làm phương án dự phòng offline khi thuyết trình, khởi chạy trực tiếp Backend bằng Python venv + Uvicorn (cổng `8000`, mặc định SQLite `server/travel.db` không cần cài PostgreSQL) và Frontend bằng Vite (cổng `5173`) theo hướng dẫn tại `README.md`.

### 9.4. Chi phí & Quota Safeguards (Quan trọng)

| Dịch vụ | Quota miễn phí | Rủi ro vượt mức | Giải pháp kiểm soát |
| --- | --- | --- | --- |
| **Google Gemini API (`google-genai`)** | Free Tier giới hạn lượt gọi/phút (RPM) theo model `GEMINI_MODEL` (mặc định `gemini-3.5-flash`) | HTTP `429 Too Many Requests` hoặc lỗi mạng khi gọi liên tục lúc demo | 1. Dùng **Structured Output JSON** trực tiếp trên catalog 327 địa điểm local nên không phát sinh vòng lặp tìm kiếm nhiều bước.<br>2. Giữ một instance `GeminiService` duy nhất trong `app.state` để kiểm soát đồng thời (concurrency/rate limit) và retry có kiểm soát.<br>3. Có **fallback cục bộ** trong `gemini_service.py` nếu Gemini gặp sự cố; hoàn thiện báo lỗi rõ ràng ở **🚧 #23**. |
| **Google Places API New *(tuỳ chọn)*** | $200 tín dụng/tháng (chỉ dùng nếu cấu hình `GOOGLE_PLACES_API_KEY`) | Phát sinh chi phí nếu gọi lặp lại nhiều lần | 1. Mặc định vận hành hoàn chỉnh trên **327 địa điểm local** (có thể để trống `GOOGLE_PLACES_API_KEY`).<br>2. Nếu bật, luôn kiểm tra bảng `places_cache` với **TTL 7 ngày** trước khi gọi ra ngoài và đặt Budget Alert trên Google Cloud Console. |
| **OpenStreetMap France Tile** | Miễn phí, không cần API key | Quá tải hoặc bị nhà mạng chặn nếu đổi sang server khác | Đã cấu hình sẵn `tile.openstreetmap.fr` thay cho `tile.openstreetmap.org` (bị DNS VNPT chặn) và cho phép đổi linh hoạt qua `VITE_MAP_TILE_URL`. |

---

## 11. Quản lý Rủi ro & Kế hoạch Dự phòng (Project Risk & Contingency Plan)

| Rủi ro dự án | Mức độ | Khả năng | Kế hoạch dự phòng (Contingency) |
| --- | --- | --- | --- |
| **Gemini API lỗi, quá tải hoặc trả sai định dạng** | Cao | Trung bình | Ràng buộc đầu ra bằng Pydantic Structured Output trong `gemini_service.py`, có retry và **fallback cục bộ** trên catalog 327 địa điểm TP.HCM. Đang xử lý việc thông báo lỗi minh bạch thay vì nuốt im lặng (**🚧 #23**) và nối trực tiếp form tạo lịch trình (**🚧 #25**). |
| **Google Places API phát sinh chi phí** | Trung bình | Thấp | `GOOGLE_PLACES_API_KEY` là **tuỳ chọn**; toàn bộ 327 địa điểm TP.HCM được tự động seed vào bảng `places` và kết quả mở rộng được cache 7 ngày trong `places_cache`. |
| **Render Free Tier "ngủ đông" trước giờ demo** | Cao | Cao | 1. Mở sẵn link web và gọi `/health` trước 3–5 phút trước khi vào phần thuyết trình.<br>2. **Backup 1:** Chạy sẵn bản local trên laptop (FastAPI Uvicorn + SQLite + Vite) không phụ thuộc Cloud.<br>3. **Backup 2:** Chuẩn bị sẵn video quay màn hình full flow phòng trường hợp mất mạng hội trường. |
| **Khác biệt giữa SQLite local và PostgreSQL production** | Thấp | Thấp | Toàn bộ 4 bảng (`users`, `trips`, `places`, `places_cache`) đều dùng chung SQLAlchemy Async ORM trong `server/app/db/models.py`, chuyển đổi môi trường chỉ qua biến `DATABASE_URL`. |
| **Bản đồ không tải được tile do mạng VNPT** | Trung bình | Trung bình | Đã chuyển tile mặc định trong `TripMap.jsx` sang OpenStreetMap France (`tile.openstreetmap.fr`) và hỗ trợ ghi đè nhanh qua `VITE_MAP_TILE_URL`. |
| **Claim làm mất chuyến của khách khi đăng ký *(🚧 #31)*** | Cao | Thấp | Thiết kế claim chỉ **gán `user_id`** cho các bản ghi khớp `x-session-id` trong cùng transaction với đăng ký/đăng nhập (lỗi thì rollback, chuyến vẫn giữ nguyên); kiểm chứng bằng `TC-16` và `TC-17`. |
| **Rò rỉ mật khẩu, API key hoặc dữ liệu riêng tư** | Cao | Thấp | Hash mật khẩu bằng `bcrypt`, xác thực JWT `HS256`, không commit `server/.env`; link chia sẻ lọc toàn bộ trường nhạy cảm qua `_public_items()`; xóa tài khoản xóa kèm toàn bộ chuyến đi. |
| **Tính năng mở rộng chưa kịp merge trước buổi bảo vệ** | Trung bình | Trung bình | Tách rõ phạm vi cốt lõi và hạng mục đang hoàn thiện (`#8/#18` Transit/Adaptive/Calendar, `#9` Docker/CI/Pytest, `#23/#25` AI form & lỗi, `#31` guest claim) để trình bày minh bạch khi bảo vệ. |
| **Chưa hỗ trợ quên mật khẩu / Google Sign-In ở Backend** | Thấp | Cao | Demo tập trung vào luồng đăng ký/đăng nhập `username + password` đã ổn định; không hứa hẹn khôi phục mật khẩu qua email trong phạm vi phiên bản hiện tại. |

---

## 🎤 13. Kịch bản Thuyết trình Demo 5 Phút & Bộ Câu hỏi Phản biện

### 13.1. Kịch bản Thuyết trình Trọng tâm (Demo Script)

- **Phút 0:00 – 0:45 (Vấn đề & Trải nghiệm ngay không cần đăng nhập):**
  *"Kính thưa Thầy Cô và Hội đồng, du lịch tự túc tại TP.HCM thường gặp khó khăn khi tự chọn điểm ăn chơi giữa hàng trăm địa điểm, sắp xếp tuyến đường hợp lý theo quận và kiểm soát chi phí di chuyển. Với **Sài Gòn Guide**, du khách không bị chặn bởi màn hình đăng nhập: ngay từ trang chủ, khách có thể mở tức thì chuyến mẫu công khai `/trip/demo` (từ `GET /api/v1/trips/demo`) hoặc bắt đầu lập lịch trình mới để trải nghiệm sản phẩm ngay lập tức."*
- **Phút 0:45 – 1:45 (Form 8 Tiêu chí & Pipeline AI trên Catalog 327 địa điểm):**
  *"Khách nhập 8 tiêu chí thực tế gồm số ngày, quận mong muốn tại TP.HCM, ngân sách, số người, phương tiện di chuyển, nhịp độ, sở thích và ghi chú. Ở Backend FastAPI, dịch vụ Gemini (`google-genai`, mặc định `gemini-3.5-flash`) dùng Structured Output JSON dựa trên kho 327 địa điểm TP.HCM thực tế tự động seed vào CSDL — đi qua bước gợi ý định hướng (`/api/v1/ai/concept`) rồi sinh lịch trình chi tiết (`/api/v1/ai/generate`), tránh tình trạng AI bịa tên quán hay tọa độ."* *(Ghi chú nhóm: nếu trình bày trực tiếp luồng gọi AI từ form, kiểm tra trạng thái hoàn tất của **🚧 #25** trước giờ demo.)*
- **Phút 1:45 – 3:00 (Workspace 4 Chế độ, Bản đồ Leaflet & Đổi điểm thông minh):**
  *"Màn hình chuyến đi đồng bộ 4 chế độ trên cùng một dữ liệu:*
  1. ***Lịch trình Timeline & Bản đồ Leaflet:*** *Bố cục 2 khung song song (bản đồ dùng tile OpenStreetMap France, thẻ Timeline 3 tầng chống tràn chữ); bấm đổi địa điểm để nhận gợi ý thay thế cùng quận (`/api/v1/ai/swap`).*
  2. ***Đi thực tế (Live Companion):*** *Thẻ Hero chặng kế tiếp, mở chỉ đường, ước tính & chọn gọi xe 3 hãng (Grab, Xanh SM, Be) và check-in chụp ảnh (marker trên bản đồ đổi thành dấu tích xanh `✓`).*
  3. ***Sổ chi tiêu:*** *Tự động tổng hợp vé, ăn uống và cước xe từng chặng, hỗ trợ sửa tiền trực tiếp (inline).*
  4. ***Tổng kết chuyến đi:*** *4 chỉ số KPI, cơ cấu chi tiêu, album ảnh check-in và xuất Thẻ ảnh kỷ niệm Story Card từ `TripRecapModal`."*
- **Phút 3:00 – 4:15 (Đăng ký tài khoản → Claim chuyến & Chia sẻ công khai):**
  *"Khi muốn lưu lâu dài trên nhiều thiết bị, khách chỉ cần đăng ký nhanh bằng `username + password` (mã hóa bcrypt, JWT HS256). Theo thiết kế mới của nhóm (**🚧 Đang triển khai (#31)**), các chuyến khách vừa tạo qua `x-session-id` sẽ được gộp (claim) thẳng vào tài khoản mới mà không mất dữ liệu, xuất hiện trong trang **Chuyến của tôi** (`/trips`). Từ đây, người dùng có thể nhân bản chuyến, tạo link chia sẻ công khai `/s/:token` (chỉ đọc, tự động lọc bỏ chi phí và ghi chú riêng tư) và thu hồi link ngay lập tức khi cần."*
- **Phút 4:15 – 5:00 (Kiến trúc gọn nhẹ, Kiểm thử & Kết luận):**
  *"Toàn bộ hệ thống vận hành trên kiến trúc React/Vite + FastAPI + SQLAlchemy Async ORM (mặc định SQLite cho môi trường local, chuyển sang Supabase PostgreSQL chỉ qua biến `DATABASE_URL`), kèm tài liệu chuẩn `docs/openapi.yaml` xuất tự động từ FastAPI và bộ kiểm thử `pytest` + `node --test`. Nhóm cũng đang hoàn thiện các phần mở rộng như tính cước/kịch bản thích ứng trời mưa/xuất lịch `.ics` (**🚧 #8/#18**) và Docker/CI (**🚧 #9**). Em xin cảm ơn Thầy Cô và mời Hội đồng đặt câu hỏi."*

### 13.2. Bộ Câu hỏi Giảng viên có thể hỏi & Trả lời

**Q1: Tại sao nhóm cho phép khách dùng thử và tạo chuyến trước rồi mới đăng ký (claim) thay vì bắt buộc đăng nhập ngay từ đầu?**
> *Trả lời: Dạ thưa Thầy Cô, nếu bắt người dùng tạo tài khoản ngay khi vừa mở trang web thì tỷ lệ rời bỏ rất cao. Vì vậy nhóm cho phép khách xem ngay chuyến mẫu `/trip/demo` (công khai, chỉ đọc) và thiết kế cơ chế tạo chuyến bằng phiên khách `x-session-id`, sau đó khi khách hài lòng và đăng ký/đăng nhập thì backend tự động gán `user_id` để gộp (claim) các chuyến đó sang tài khoản mà không mất lịch trình vừa tạo (**🚧 Đang triển khai (#31)**).*

**Q2: Làm sao hệ thống tránh việc AI Gemini "bịa" ra địa điểm hoặc tọa độ không có thật ở TP.HCM?**
> *Trả lời: Dạ, thay vì để AI tự sinh tên quán tự do, Backend nạp sẵn 327 địa điểm thực tế khắp 8 quận TP.HCM từ `server/app/db/hcmc_data.py` vào bảng `places` (kèm tọa độ GPS, giờ mở cửa, giá dự kiến, ảnh `photo_url` và thuộc tính `is_indoor`). Trong `gemini_service.py`, System Instruction và Pydantic Structured Output ép Gemini chỉ được chọn từ catalog đã kiểm chứng này; nếu Gemini lỗi hoặc hết quota thì dịch vụ vẫn có fallback cục bộ hợp lệ trên cùng tập dữ liệu.*

**Q3: Khi chia sẻ link công khai `/s/:token`, hệ thống bảo vệ thông tin riêng tư của chủ chuyến đi như thế nào?**
> *Trả lời: Dạ, endpoint `POST /api/v1/trips/{id}/share` tạo `share_token` ngẫu nhiên. Khi người nhận mở `GET /api/v1/trips/shared/{token}` (không cần đăng nhập), Backend lọc toàn bộ lịch trình qua hàm `_public_items()` để loại bỏ các trường chứa `user`, `session`, `email`, `phone`, `checkin`, `cost`, `budget`, `expense`, `note`. Trang chia sẻ chỉ cho xem (chỉ đọc) hoặc nhân bản sang chuyến mới, và chủ sở hữu có thể thu hồi link bất kỳ lúc nào qua `DELETE /api/v1/trips/{id}/share` (link cũ sẽ trả `404`).*

**Q4: Vì sao dự án hỗ trợ cả SQLite lẫn PostgreSQL mà không bị lệch code truy vấn?**
> *Trả lời: Dạ, nhóm đã thống nhất toàn bộ 4 bảng (`users`, `trips`, `places`, `places_cache`) bằng SQLAlchemy 2.0 Async ORM trong `server/app/db/models.py` thay vì viết raw SQL đặc thù cho một hệ quản trị. Nhờ đó khi code local hoặc demo offline chỉ cần chạy mặc định SQLite (`sqlite+aiosqlite:///./travel.db`) không tốn công cài đặt DB, còn khi deploy production trên Render/Supabase chỉ cần đổi biến môi trường `DATABASE_URL` sang `postgresql+asyncpg://...`.*

**Q5: Kịch bản dự phòng trời mưa và xuất lịch `.ics` được xử lý ra sao?**
> *Trả lời: Dạ, ngay từ tầng dữ liệu, mỗi địa điểm trong 327 điểm TP.HCM đều đã có thuộc tính `is_indoor` (trong nhà / ngoài trời) và khung giờ `open_time`/`close_time`. Mô-đun tính cước Haversine, lọc thay thế các điểm `is_indoor=False` khi trời mưa và xuất file iCalendar `.ics` hiện đang được nhóm hoàn thiện và review trên PR `#18` (**🚧 Đang triển khai (#8/#18)**).*

---

## 14. Checklist tài liệu nộp bài / thuyết trình

- [ ] Slide thuyết trình (vấn đề → giải pháp → kiến trúc FastAPI/React → UI/UX 4 chế độ → live demo → các phần mở rộng & kết luận)
- [ ] Video demo backup Full HD (quay màn hình full flow, đề phòng mạng phòng thuyết trình chập chờn)
- [ ] Bản deploy hoạt động trên Vercel (Frontend) + Render (Backend FastAPI) + Supabase PostgreSQL (kèm link live trong slide)
- [ ] Source code trên GitHub kèm `README.md` (hướng dẫn chạy local macOS/Linux/Windows) và `docs/openapi.yaml` đồng bộ với `/openapi.json`
- [ ] Kịch bản demo 5 phút viết sẵn, khớp chính xác các tính năng đang chạy trên nhánh `main`
- [ ] Chạy kiểm thử tự động trước giờ nộp: `cd server && .venv/bin/pytest app/tests/test_places.py` (và các test bổ sung từ **🚧 #9**) và `cd client && npm test` (`node --test`)
- [ ] Xác nhận Backend tự động tạo bảng ORM, auto-seed đủ **327 địa điểm TP.HCM** và `GET /health` trả `"healthy"`
- [ ] Mở link web trước 2–3 phút để Render Free Tier "thức dậy" trước khi vào phòng bảo vệ
- [ ] Test sẵn bản chạy local trên laptop (FastAPI Uvicorn cổng `8000` + Vite cổng `5173` + SQLite `travel.db`) làm phương án dự phòng offline
- [ ] Test giao diện responsive trên mobile thật hoặc Chrome DevTools (375px / 768px / 1280px)
- [ ] Test mở trang công khai `/trip/demo` không cần đăng nhập; test chia sẻ link `/s/:token` ở cửa sổ ẩn danh, sau đó thu hồi link và kiểm tra link cũ trả `404`
- [ ] Test luồng khách tạo chuyến (`x-session-id`) → đăng ký tài khoản → kiểm tra chuyến được claim (`claimed_trips`) khi **🚧 #31** hoàn tất
- [ ] Đảm bảo **không commit `server/.env`** và không để lộ `GEMINI_API_KEY`, `JWT_SECRET`, `GOOGLE_PLACES_API_KEY` trong slide, video hay ảnh chụp màn hình
