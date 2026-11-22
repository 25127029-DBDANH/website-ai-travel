# 🧭 SÀI GÒN GUIDE — TRỢ LÝ AI LẬP KẾ HOẠCH DU LỊCH TP. HỒ CHÍ MINH
## ĐỒ ÁN MÔN HỌC: TƯ DUY TÍNH TOÁN (CSC10014) — HCMUS
> **Trường Đại học Khoa học Tự nhiên — ĐHQG-HCM | Khoa Công Nghệ Thông Tin**  
> **Nhóm thực hiện:** Nhóm 7 (7 thành viên)  
> **Kho mã nguồn chính thức:** [`https://github.com/25127029-DBDANH/website-ai-travel`](https://github.com/25127029-DBDANH/website-ai-travel)  
> **Phiên bản:** Hoàn thiện v2.0 (4 Chế độ Trải nghiệm, Đồng hành Thời gian thực & Tích hợp Gọi xe 3 Hãng)

---

## 🌟 Tổng Quan Về Dự Án

**Sài Gòn Guide** là nền tảng web thông minh ứng dụng Trí tuệ nhân tạo (Google Gemini qua SDK `google-genai`) chuyên sâu cho du lịch bản địa tại Thành phố Hồ Chí Minh. Hệ thống sử dụng **React 18 + Vite + Tailwind + Leaflet** (tile bản đồ OpenStreetMap France, font **Be Vietnam Pro**) ở Frontend và **Python FastAPI + SQLAlchemy Async ORM** (mặc định **SQLite**, hỗ trợ **PostgreSQL** qua `DATABASE_URL`, tự động seed **327 địa điểm TP.HCM**) ở Backend.

Hệ thống đồng hành trọn vẹn cùng du khách qua toàn bộ hành trình khép kín: từ lúc **lên kế hoạch cá nhân hóa**, **tinh chỉnh lịch trình trên bản đồ số**, **đồng hành thời gian thực ngoài thực địa (Live Companion)**, **quản lý chi tiêu & cước xe di chuyển**, cho đến **tổng kết chuyến đi và xuất thẻ ảnh kỷ niệm (Story Card)**. Khách vãng lai có thể trải nghiệm ngay trang demo công khai `/trip/demo` không cần đăng nhập; cơ chế tạo chuyến cho khách (`x-session-id`) rồi gộp (claim) sang tài khoản khi đăng ký/đăng nhập đang được triển khai (**🚧 Đang triển khai (#31)**).

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           4 CHẾ ĐỘ TRẢI NGHIỆM ĐỒNG BỘ TOÀN DIỆN                                │
├──────────────────────┬──────────────────────┬──────────────────────┬────────────────────────────┤
│ 1. LỊCH TRÌNH        │ 2. ĐI THỰC TẾ        │ 3. SỔ CHI TIÊU       │ 4. TỔNG KẾT                │
│    TIMELINE (Xanh)   │    COMPANION (Xanh lá│    & DI CHUYỂN (Cam) │    CHUYẾN ĐI (Tím)         │
├──────────────────────┼──────────────────────┼──────────────────────┼────────────────────────────┤
│ • Bản đồ Leaflet     │ • Thẻ Hero chặng tới │ • Vé & ẩm thực       │ • 4 Chỉ số KPIs toàn diện  │
│ • Thẻ 3 tầng chống đè│ • Chỉ đường Google   │ • Cước xe từng chặng │ • Cơ cấu chi tiêu 3 nhóm   │
│ • Chốt điểm (Accept) │ • 3 App: Grab, Xanh, │ • Sửa tiền trực tiếp │ • Album ảnh check-in       │
│ • Đổi điểm thông minh│   Be mở app có cước  │   (Inline fare edit) │ • Xuất Thẻ ảnh kỷ niệm     │
│ • Marker biến thành ✓│ • Check-in chụp ảnh  │ • Lọc danh mục tiền  │   Story Card (TripRecap)   │
└──────────────────────┴──────────────────────┴──────────────────────┴────────────────────────────┘
```

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Cấu hình `.env` (Bắt buộc trước khi chạy Backend)
Sao chép file mẫu `server/.env.example` thành `server/.env` và điền khóa API cần thiết:

```bash
cp server/.env.example server/.env
```

Mở `server/.env` và cấu hình:
- `GEMINI_API_KEY`: khóa API Google Gemini (tạo tại Google AI Studio).
- `GEMINI_MODEL`: mặc định `gemini-3.5-flash` (có thể đổi sang model được kích hoạt trong project).
- `DATABASE_URL`: mặc định `sqlite+aiosqlite:///./travel.db` (tự tạo 4 bảng ORM và auto-seed 327 địa điểm TP.HCM khi khởi động; hỗ trợ chuyển sang PostgreSQL qua `postgresql+asyncpg://...`).
- `JWT_SECRET`: đổi thành chuỗi ngẫu nhiên bảo mật khi triển khai.
- `GOOGLE_PLACES_API_KEY`: tuỳ chọn (bỏ trống vẫn hoạt động đầy đủ với 327 địa điểm local).

> [!CAUTION]
> **KHÔNG commit** file `server/.env` lên Git (file đã được khai báo trong `.gitignore`).

### 2. Chạy Backend (Python 3.11–3.13 + FastAPI — Cổng `8000`)
Mở terminal tại thư mục gốc dự án (cú pháp macOS/Linux):

```bash
cd server && python -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn main:app --reload --port 8000
```

- Tài liệu API tương tác (Swagger UI): **`http://localhost:8000/docs`**
- Kiểm tra trạng thái server: **`http://localhost:8000/health`**
- **Ghi chú cho Windows:** kích hoạt môi trường ảo bằng `.venv\Scripts\activate`, sau đó chạy `pip install -r requirements.txt` và `uvicorn main:app --reload --port 8000`.

### 3. Chạy Frontend (React 18 + Vite — Cổng `5173`)
Mở terminal thứ hai tại thư mục gốc dự án:

```bash
cd client && npm install && npm run dev
```

- Mở trình duyệt tại: **`http://localhost:5173`**
- Trang demo công khai (chỉ đọc, không cần đăng nhập): **`http://localhost:5173/trip/demo`**

### 4. Cập nhật đặc tả OpenAPI (`docs/openapi.yaml`)
File `docs/openapi.yaml` được xuất tự động từ endpoint `/openapi.json` của FastAPI. Khi Backend đang chạy ở cổng `8000`, có thể lấy schema mới nhất bằng lệnh:

```bash
curl -s http://localhost:8000/openapi.json
```

*(Từ JSON xuất ra bởi lệnh trên, nhóm chuyển đổi sang `docs/openapi.yaml` mỗi khi thêm/sửa endpoint để giữ tài liệu đồng bộ với code.)*

### 5. Script chạy nhanh cho Windows (`.bat`)
Các file `CHAY-DEMO.bat`, `run_all.bat`, `run_backend.bat`, `run_frontend.bat` ở thư mục gốc **chỉ dành cho Windows**:
- `CHAY-DEMO.bat`: khởi chạy nhanh máy chủ tĩnh `client/server.py` (cổng `5173`) để xem nhanh trang `/trip/demo` trên Windows.
- `run_all.bat` / `run_backend.bat` / `run_frontend.bat`: mở nhanh Backend/Frontend trên Windows.

*(Trên macOS/Linux có thể chạy trực tiếp bằng lệnh thủ công ở mục 2 & 3, hoặc dùng `start-preview.sh` / `start-preview.command` để mở preview tĩnh.)*

### 6. Docker Compose — 🚧 Đang triển khai (#9)
> [!NOTE]
> **🚧 Đang triển khai (#9):** File `docker-compose.yml` hiện đang trống (0 byte), chưa có `server/Dockerfile` và `client/Dockerfile`. Vui lòng khởi chạy thủ công theo mục 2 & 3 ở trên.

---

## 👥 BẢNG PHÂN CÔNG NHIỆM VỤ CHI TIẾT 7 THÀNH VIÊN (100% FILE OWNERSHIP)

> [!IMPORTANT]
> **Quy định phân công cốt lõi của nhóm:**
> 1. **Diệp Bảo Danh (Trưởng nhóm - MSSV: 25127029)** và **Phạm Gia Hưng** **cố định phụ trách toàn diện mảng Front-end**.
> 2. Các thành viên phụ trách Backend/AI/Data (**Khang, Đạt, Lam, Hạo**) chịu trách nhiệm **tự tích hợp trực tiếp API vào Frontend và tự kiểm thử (E2E Testing)** cho đến khi tính năng vận hành trơn tru trên giao diện người dùng.
> 3. **Đoàn Hải Đăng** chịu trách nhiệm toàn diện về **Mã nguồn Hạ tầng DevOps (Docker, CI/CD GitHub Actions), Bộ mã nguồn Kiểm thử tự động (Pytest Test Suite), Báo cáo Kỹ thuật và Thuyết trình/Video Demo**.
> 4. **100% File Code có chủ sở hữu rõ ràng:** Tuyệt đối không để sót bất kỳ file cấu hình, component, endpoint hay script kiểm thử nào.

---

### 📊 Bảng Ma Trận Phân Công Mã Nguồn Chi Tiết (Exhaustive Code Mapping)

| Phân hệ / Hạng mục | Danh mục File Mã nguồn (Code Files) | Thành viên chịu trách nhiệm |
| :--- | :--- | :---: |
| **Frontend: Điều phối Workspace & Bản đồ Leaflet** | `client/src/pages/TripPage.jsx`, `client/src/components/itinerary/TripMap.jsx` | **Diệp Bảo Danh** |
| **Frontend: Lịch trình Timeline 3 tầng & Thanh điều hướng** | `client/src/components/itinerary/TimelineItem.jsx`, `client/src/components/itinerary/ItineraryPanel.jsx` | **Diệp Bảo Danh** |
| **Frontend: Chế độ Đi thực tế & Modal Check-in ảnh** | `client/src/components/companion/LiveCompanionView.jsx`, `client/src/components/companion/CheckinModal.jsx` | **Diệp Bảo Danh** |
| **Frontend: Cấu trúc Client API Gateway & Server Demo** | `client/src/lib/api.js`, `client/server.py` | **Diệp Bảo Danh** |
| **Frontend: Sổ chi tiêu, Cước xe inline & Báo cáo Tổng kết** | `client/src/components/companion/ExpenseTrackerView.jsx`, `client/src/components/companion/TripSummaryView.jsx` | **Phạm Gia Hưng** |
| **Frontend: Xuất Thẻ kỷ niệm Story Card & Popup Recap** | `client/src/components/companion/TripRecapModal.jsx` *(tích hợp sẵn Story Card Canvas)* | **Phạm Gia Hưng** |
| **Frontend: Form khảo sát 8 tiêu chí & Landing Page 3D** | `client/src/components/TripForm.jsx`, `client/src/pages/LandingPage.jsx`, `client/src/components/landing/*` | **Phạm Gia Hưng** |
| **Frontend: Quản lý Chuyến của tôi & Cài đặt Tài khoản** | `client/src/pages/MyTripsPage.jsx`, `client/src/pages/SettingsPage.jsx` | **Phạm Gia Hưng** |
| **Frontend: Hệ thống Đa ngôn ngữ Song ngữ Anh - Việt & Test FE** | `client/src/i18n/I18nContext.jsx`, `client/src/i18n/translations.js`, `client/test/translations.test.js` | **Phạm Gia Hưng** |
| **Frontend: Tích hợp Đăng nhập, Đăng ký Tài khoản & Auth State** | `client/src/components/AuthModal.jsx`, `client/src/context/AuthContext.jsx`, `client/src/lib/auth.js` | **Đỗ Nguyễn An Khang** *(Tự tích hợp)* |
| **Frontend: Tích hợp Trang xem chuyến đi công khai** | `client/src/pages/SharedTripPage.jsx`, `client/src/components/ShareDialog.jsx` | **Đỗ Nguyễn An Khang** *(Tự tích hợp)* |
| **Frontend: Tích hợp Modal Chi tiết địa điểm TP.HCM** | `client/src/components/itinerary/PlaceDetailModal.jsx` | **Ngô Tấn Đạt** *(Tự tích hợp)* |
| **Frontend: Tích hợp Cước xe 3 hãng & Khối di chuyển chặng** | `client/src/components/itinerary/TransitConnector.jsx`, `client/src/components/common/RidePickerModal.jsx` | **Đàng Minh Hạo & Diệp Bảo Danh** |
| **Backend: Khung FastAPI, Core Security & JWT Dependency** | `server/main.py`, `server/app/api/v1/api.py`, `server/app/core/security.py`, `server/app/core/config.py`, `server/app/core/dependencies.py` | **Đỗ Nguyễn An Khang** |
| **Backend: Pydantic Schemas & Endpoints Auth / Trips** | `server/app/schemas/user.py`, `server/app/schemas/trip.py`, `server/app/api/v1/endpoints/auth.py`, `server/app/api/v1/endpoints/trips.py` *(phiên khách `x-session-id` & claim: 🚧 #31)* | **Đỗ Nguyễn An Khang** |
| **Backend: ORM SQLite/PostgreSQL, Session & Data 327 địa điểm TP.HCM** | `server/app/db/models.py`, `server/app/db/schema.sql`, `server/app/db/session.py`, `server/app/db/hcmc_data.py` | **Ngô Tấn Đạt** |
| **Backend: Places Cache TTL 7 ngày, Endpoints & Test Places** | `server/app/services/places_service.py`, `server/app/api/v1/endpoints/places.py`, `server/app/tests/test_places.py` | **Ngô Tấn Đạt** |
| **Backend: SDK Gemini (`google-genai`, mặc định `gemini-3.5-flash`) & Endpoints AI** | `server/app/services/gemini_service.py`, `server/app/schemas/ai.py`, `server/app/api/v1/endpoints/ai.py` *(nối form FE: 🚧 #25; xử lý lỗi: 🚧 #23)* | **Lê Hữu Lam** |
| **Backend: Thuật toán Haversine, Cước xe Grab/XanhSM/Be** | `server/app/utils/transit_calculator.py` — **🚧 Đang triển khai (#8/#18)** *(file hiện rỗng trên `main`)* | **Đàng Minh Hạo** |
| **Backend: Động cơ Kịch bản Thích ứng Trời mưa & Kẹt xe** | `server/app/services/contingency_service.py` — **🚧 Đang triển khai (#8/#18)** *(file hiện rỗng trên `main`)* | **Đàng Minh Hạo** |
| **Backend: Dịch vụ Calendar .ICS & Endpoints Calendar** | `server/app/services/calendar_service.py`, `server/app/schemas/calendar.py`, `server/app/api/v1/endpoints/calendar.py` — **🚧 Đang triển khai (#8/#18)** *(file hiện rỗng trên `main`)* | **Đàng Minh Hạo** |
| **DevOps: Docker Compose & Dockerfiles Multi-stage** | `docker-compose.yml` *(hiện rỗng)*, `client/Dockerfile`, `server/Dockerfile` — **🚧 Đang triển khai (#9)** | **Đoàn Hải Đăng** |
| **DevOps: Pipeline CI/CD GitHub Actions Tự động hóa** | `.github/workflows/ci.yml` — **🚧 Đang triển khai (#9)** | **Đoàn Hải Đăng** |
| **QA/Test: Bộ mã nguồn Kiểm thử tự động Pytest** | `server/app/tests/test_places.py` *(đã có)*; `conftest.py`, `test_auth.py`, `test_trips.py`, `test_ai.py`, `test_transit.py`, `test_calendar.py` — **🚧 Đang triển khai (#9)** | **Đoàn Hải Đăng** |
| **DevOps: Hệ thống Script Windows (chỉ dành cho Windows)** | `CHAY-DEMO.bat`, `run_all.bat`, `run_frontend.bat`, `run_backend.bat` | **Đoàn Hải Đăng & Diệp Bảo Danh** |

---

### 1. DIỆP BẢO DANH — FRONTEND LEAD & SYSTEM ARCHITECT (TRƯỞNG NHÓM)
* **Họ và tên:** **Diệp Bảo Danh**
* **Mã số sinh viên (MSSV):** `25127029`
* **Vai trò chuyên môn:** Trưởng nhóm — Kiến trúc sư Hệ thống & Lead Frontend
* **Thư mục & File sở hữu chính:**
  * `client/src/pages/TripPage.jsx` (Điều phối 4 chế độ tab, state đồng bộ giữa bản đồ & timeline)
  * `client/src/components/itinerary/TripMap.jsx` (Khung 1 Bản đồ Leaflet dùng tile OpenStreetMap France, marker số `[1,2,3,4]`, polyline, đổi pin sang dấu tích xanh `✓`)
  * `client/src/components/itinerary/TimelineItem.jsx` (Khung 2 Thẻ lịch trình 3 tầng chống tràn/đè chữ, chốt Accept, Swap)
  * `client/src/components/itinerary/ItineraryPanel.jsx` (Thanh điều khiển lịch trình tối ưu, dọn nút trùng lặp)
  * `client/src/components/companion/LiveCompanionView.jsx` (Tab 2 Chế độ Đi thực tế thời gian thực, thẻ Hero Next Stop, hoàn thành chuyến đi)
  * `client/src/components/companion/CheckinModal.jsx` (Modal check-in chặng, tải ảnh lưu niệm, ghi chú)
  * `client/src/lib/api.js` (Cấu trúc Gateway API trung tâm kết nối Backend qua `VITE_API_BASE`)
  * `client/server.py` & `CHAY-DEMO.bat` *(chỉ dành cho Windows)* (Server phục vụ Single Page Demo và script khởi chạy nhanh)
* **Nhiệm vụ cụ thể:**
  1. *Quản trị Repository GitHub:* Phân chia nhánh tính năng (`feature/*`), review Pull Request, giải quyết xung đột mã nguồn (merge conflict).
  2. *Thiết kế Khung 1 (Bản đồ Leaflet):* Vẽ tuyến đường polyline nối các chặng, pan/zoom tự động theo tọa độ GPS, đổi marker thành icon `✓` khi chặng được check-in.
  3. *Tái cấu trúc Khung 2 (Timeline 3 tầng):* Giải quyết triệt để lỗi tràn/đè chữ với tên địa điểm dài; chuyển nền thẻ sang màu xanh ngọc nhẹ (`emerald-50`) khi check-in; khóa toàn bộ thao tác đổi điểm khi chặng đã hoàn thành.
  4. *Tab 2 Đi thực tế & Modal Gọi xe:* Thẻ Hero hiển thị điểm đến tiếp theo, tích hợp gọi xe 3 app (Grab, Xanh SM, Be) với giá cước và deep-link mở app di động; nút "Hoàn thành chuyến đi" chuyển sang Tab 4 Tổng kết.
* **Tiêu chí hoàn thành (DoD):** Giao diện 2 khung hình hoạt động trơn tru; bản đồ và timeline đồng bộ tức thì; không có bất kỳ lỗi che khuất chữ nào trên giao diện.

---

### 2. PHẠM GIA HƯNG — FRONTEND DEVELOPER & UI/UX SPECIALIST
* **Họ và tên:** **Phạm Gia Hưng**
* **Vai trò chuyên môn:** Frontend Developer & Chuyên viên Thiết kế Giao diện (UI/UX)
* **Thư mục & File sở hữu chính:**
  * `client/src/components/companion/ExpenseTrackerView.jsx` (Tab 3 Sổ chi tiêu, thêm chi tiêu, sửa cước xe inline)
  * `client/src/components/companion/TripSummaryView.jsx` (Tab 4 Giao diện Tổng kết chuyến đi, 4 chỉ số KPI)
  * `client/src/components/companion/TripRecapModal.jsx` (Modal chúc mừng hoàn thành chuyến đi & xuất Thẻ ảnh kỷ niệm Story Card Canvas)
  * `client/src/components/TripForm.jsx` (Form khảo sát 8 tiêu chí chuyên sâu)
  * `client/src/pages/LandingPage.jsx` & `client/src/components/landing/*` (`Hero3D.jsx`, `MagneticButton.jsx`, `PhotoMarquee.jsx`, `SpotlightCard.jsx`)
  * `client/src/pages/MyTripsPage.jsx` (Trang "Chuyến của tôi", danh sách chuyến đi, lọc trạng thái, nhân bản)
  * `client/src/pages/SettingsPage.jsx` (Trang Cài đặt tài khoản, bảo mật & xóa tài khoản)
  * `client/src/i18n/I18nContext.jsx`, `client/src/i18n/translations.js` & `client/test/translations.test.js` (Hệ thống Đa ngôn ngữ VI/EN & kiểm thử `node --test`)
* **Nhiệm vụ cụ thể:**
  1. *Tab 3 Sổ chi tiêu & Quản lý di chuyển:* Hiển thị chi tiết tiền vé tham quan, ăn uống và **từng chặng xe di chuyển**; tính năng bấm sửa cước xe trực tiếp (*Inline fare editing*); bộ lọc danh mục và thanh tiến độ ngân sách.
  2. *Tab 4 Giao diện Tổng kết chuyến đi:* Thống kê 4 chỉ số KPI cốt lõi (Tổng chi phí, Chênh lệch ngân sách, Số điểm đã ghé, Tổng cự ly); biểu đồ cơ cấu chi tiêu 3 nhóm; album ảnh check-in thực tế.
  3. *Xuất Thẻ kỷ niệm (Story Card trong `TripRecapModal.jsx`):* Lập trình sinh ảnh đồ họa tổng kết chuyến đi cho phép tải ảnh về máy để chia sẻ mạng xã hội.
  4. *Form khảo sát 8 tiêu chí chuyên sâu:* Xây dựng giao diện thu thập nhu cầu du khách (kết nối gọi trực tiếp AI Generator: **🚧 Đang triển khai (#25)**).
  5. *Trang My Trips & Settings:* Lập trình giao diện quản lý các chuyến đi đã lưu, nhân bản chuyến đi, xem thông tin tài khoản và xóa tài khoản.
  6. *Hệ thống Đa ngôn ngữ (VI/EN) & Responsive Mobile:* Đảm bảo 100% nhãn giao diện chuẩn ngữ nghĩa Anh - Việt (kiểm thử tự động qua `node --test`); tối ưu giao diện trên Smartphone ngoài trời.
* **Tiêu chí hoàn thành (DoD):** Sổ chi tiêu tính toán tiền chính xác; xuất ảnh Story Card sắc nét; test i18n pass; giao diện responsive mượt mà trên iPhone/Android.

---

### 3. ĐỖ NGUYỄN AN KHANG — BACKEND LEAD & AUTHENTICATION SERVICE
* **Họ và tên:** **Đỗ Nguyễn An Khang**
* **Vai trò chuyên môn:** Backend Lead & Kỹ sư Dịch vụ Xác thực & Quản trị Chuyến đi
* **Thư mục & File sở hữu chính:**
  * `server/main.py` (File khởi chạy FastAPI, lifespan khởi tạo Gemini + ORM + seed, cấu hình CORS, Global Exception Handler)
  * `server/app/api/v1/api.py` (Router tổng hợp API prefix `/api/v1`)
  * `server/app/core/config.py`, `server/app/core/security.py`, `server/app/core/dependencies.py` (Cấu hình môi trường `.env`, mã hóa bcrypt, JWT HS256 Bearer)
  * `server/app/schemas/user.py`, `server/app/schemas/trip.py` (Pydantic models)
  * `server/app/api/v1/endpoints/auth.py` (Đăng ký `POST /register`, đăng nhập `POST /login`, `GET /me`, xóa tài khoản `DELETE /me`; Google Sign-In, đổi mật khẩu, quên mật khẩu chưa có ở backend)
  * `server/app/api/v1/endpoints/trips.py` (CRUD chuyến đi, `GET /trips/me`, `GET /trips/demo` công khai chỉ đọc, `PATCH /trips/{id}/items/{day}/{order}`, `POST /trips/{id}/clone`, `POST|DELETE /trips/{id}/share`, `GET /trips/shared/{token}`, `POST /trips/shared/{token}/clone`)
  * `client/src/pages/SharedTripPage.jsx`, `client/src/components/ShareDialog.jsx` *(Tự tích hợp)*
* **Nhiệm vụ cụ thể:**
  1. *Khung dự án FastAPI:* Dựng cấu trúc mã nguồn Backend chuẩn RESTful với prefix `/api/v1`; cấu hình CORS qua `CORS_ORIGINS`; thiết lập bắt lỗi ngoại lệ tập trung.
  2. *Hệ thống Xác thực (Auth Service):* Mã hóa mật khẩu bằng `bcrypt`; cấp phát và xác thực JWT Bearer Token (`OAuth2PasswordBearer`, `HS256`) trong Dependency `get_current_user`; hỗ trợ đăng ký, đăng nhập và xóa tài khoản (xóa kèm chuyến đi).
  3. *Bộ API Quản lý Chuyến đi:* Tạo/lưu chuyến đi; lấy dữ liệu chi tiết lịch trình; cập nhật trạng thái chặng (`visited`, ghi chú, ảnh); danh sách chuyến đi của user (`/trips/me`); chuyến demo công khai (`/trips/demo`); nhân bản chuyến đi; chia sẻ link công khai ẩn thông tin nhạy cảm (`_public_items`).
  4. *Phiên khách & Claim chuyến (**🚧 Đang triển khai (#31)**):* Cho phép khách tạo chuyến bằng header `x-session-id` (hiện tại `POST /api/v1/trips/` vẫn yêu cầu đăng nhập), và tự động gộp (claim) chuyến của khách sang tài khoản khi đăng ký/đăng nhập.
  5. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Kết nối API đăng nhập/đăng ký vào `AuthModal.jsx` và `AuthContext.jsx`.
     * Kết nối danh sách chuyến đi vào `MyTripsPage.jsx`.
     * Kết nối trang chia sẻ công khai vào `SharedTripPage.jsx`.
     * Tự test luồng đăng nhập, lưu chuyến đi và chia sẻ link công khai cho tới khi chạy thông suốt.
* **Tiêu chí hoàn thành (DoD):** Xác thực an toàn 100%; bảo vệ route chặt chẽ; CRUD chuyến đi phản hồi dưới 100ms; luồng phiên khách → claim (`#31`) và E2E trên Web hoạt động hoàn hảo.

---

### 4. NGÔ TẤN ĐẠT — DATABASE & DATA ENGINEER
* **Họ và tên:** **Ngô Tấn Đạt**
* **Vai trò chuyên môn:** Kỹ sư Cơ sở Dữ liệu & Quản trị Dữ liệu Địa điểm Sài Gòn
* **Thư mục & File sở hữu chính:**
  * `server/app/db/models.py` (4 Model ORM thống nhất: `User`, `Trip`, `Place`, `PlaceCache` — tương thích SQLite & PostgreSQL)
  * `server/app/db/schema.sql` (Lược đồ CSDL PostgreSQL tham chiếu)
  * `server/app/db/session.py` (Cấu hình SQLAlchemy Async Engine & `AsyncSessionLocal`)
  * `server/app/db/hcmc_data.py` (Kho dữ liệu Auto-seed **327 địa điểm TP.HCM** — 40+ địa điểm/quận trên 8 quận trọng điểm)
  * `server/app/services/places_service.py` (Truy vấn ORM, bộ đệm Cache TTL 7 ngày & Fallback Google Places API)
  * `server/app/api/v1/endpoints/places.py` (API `/places/search`, `/places/nearby`, `/places/photo`, `/places/{id}`)
  * `server/app/tests/test_places.py` (Kiểm thử tự động Pytest cho dữ liệu 327 địa điểm, Haversine, `PlaceCache` TTL và thứ tự route `/photo`)
  * `client/src/components/itinerary/PlaceDetailModal.jsx` *(Tự tích hợp)*
* **Nhiệm vụ cụ thể:**
  1. *Kiến trúc CSDL chuẩn SQLAlchemy Async ORM (mặc định SQLite `sqlite+aiosqlite:///./travel.db`, hỗ trợ PostgreSQL qua `DATABASE_URL`):* `Base.metadata.create_all` tự động tạo đủ 4 bảng (`users`, `trips`, `places`, `places_cache`); tự động nạp 327 địa điểm từ `hcmc_data.py` trong `lifespan` khi khởi động lần đầu.
  2. *Bộ đệm Địa điểm (Places Cache TTL 7 ngày):* Lưu cache trong bảng `places_cache`; ưu tiên trả dữ liệu từ CSDL cục bộ; chỉ gọi Google Places API New khi cấu hình `GOOGLE_PLACES_API_KEY` và cache miss hoặc quá hạn 7 ngày.
  3. *Tập dữ liệu Mồi TP.HCM (`hcmc_data.py`):*
     * **Quy mô đã nạp:** **327 địa điểm thực tế** phủ đều 8 quận trọng điểm (Quận 1, Quận 3, Quận 4, Quận 5, Bình Thạnh, Phú Nhuận, TP. Thủ Đức, Quận 7 — tối thiểu 40+ điểm/quận).
     * **Cơ cấu danh mục đầy đủ:** Địa điểm tham quan/di tích/bảo tàng, quán ăn/ẩm thực địa phương và quán cà phê/đồ uống.
     * **Bộ trường dữ liệu chuẩn hóa:** Tên tiếng Việt & tiếng Anh, địa chỉ, quận, tọa độ GPS (`latitude`, `longitude`), danh mục (`category`), `is_indoor`, giờ mở/đóng cửa (`open_time`, `close_time`), mức giá vé dự kiến (`entry_fee_vnd`), điểm đánh giá, `tags` JSON và đường dẫn ảnh `photo_url`.
  4. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Đảm bảo dữ liệu từ DB hiển thị đầy đủ trên Bản đồ Leaflet (`TripMap.jsx`).
     * Tự kết nối API chi tiết địa điểm vào `PlaceDetailModal.jsx` (ảnh, mô tả, giờ mở cửa).
     * Tự test truy vấn dữ liệu địa điểm hiển thị chính xác trên giao diện Frontend.
* **Tiêu chí hoàn thành (DoD):** Đồng bộ 100% sang SQLAlchemy ORM chạy mượt trên cả SQLite (`travel.db`) lẫn PostgreSQL/Supabase; nạp đủ 327 địa điểm TP.HCM; `pytest server/app/tests/test_places.py` pass toàn bộ; API `GET /api/v1/places/search` phản hồi nhanh.

---

### 5. LÊ HỮU LAM — AI ENGINE & PROMPT ENGINEER
* **Họ và tên:** **Lê Hữu Lam**
* **Vai trò chuyên môn:** Kỹ sư Trí tuệ Nhân tạo & Kỹ thuật Prompt (Google Gemini Integration)
* **Thư mục & File sở hữu chính:**
  * `server/app/schemas/ai.py` (Pydantic Schema ràng buộc Gemini Structured Output JSON)
  * `server/app/services/gemini_service.py` (SDK `google-genai`, model đọc từ biến môi trường `GEMINI_MODEL` — mặc định `gemini-3.5-flash`, Prompt Engineering & fallback cục bộ)
  * `server/app/api/v1/endpoints/ai.py` (API `POST /api/v1/ai/concept`, `POST /api/v1/ai/generate` và `POST /api/v1/ai/swap`)
* **Nhiệm vụ cụ thể:**
  1. *Tích hợp Google Gemini API:* Cấu hình thư viện `google-genai`, đọc model từ biến môi trường `GEMINI_MODEL` (mặc định `gemini-3.5-flash`), quản lý `GEMINI_API_KEY` an toàn qua `.env`, có cơ chế retry và fallback cục bộ trên catalog địa điểm TP.HCM khi gặp lỗi. *(🚧 Đang triển khai (#23): hiển thị/báo lỗi rõ ràng thay vì nuốt im lặng lỗi Gemini.)*
  2. *Kỹ thuật Prompt Chuyên gia Bản địa:* Soạn thảo System Instruction định vị AI am hiểu văn hóa, ẩm thực Sài Gòn, chỉ chọn địa điểm trong catalog local đã kiểm chứng (không tự bịa địa điểm/tọa độ/giá), tôn trọng múi giờ `Asia/Ho_Chi_Minh`.
  3. *Gemini Structured Outputs:* Ràng buộc chặt chẽ JSON Schema đầu ra bằng Pydantic (`ConceptResponse`, `TripGenerationResponse`, `SmartSwapResponse`).
  4. *Động cơ Đề xuất Concept & Sinh Lịch trình:* `POST /api/v1/ai/concept` đề xuất định hướng chuyến đi; `POST /api/v1/ai/generate` lựa chọn địa điểm theo cụm quận và phân bổ ngân sách hợp lý theo ngày.
  5. *Logic AI Đổi địa điểm thông minh (Smart Swap):* `POST /api/v1/ai/swap` phân tích lý do đổi điểm và đề xuất 2–3 địa điểm thay thế tương đương cùng khu vực và chi phí.
  6. *Tích hợp AI vào giao diện Frontend & Test E2E — **🚧 Đang triển khai (#25)** :*
     * Kết nối `TripForm.jsx` gọi trực tiếp `POST /api/v1/ai/concept` và `POST /api/v1/ai/generate` (hiện form tạo lịch trình chưa gọi API AI).
     * Kết nối luồng Smart Swap (`POST /api/v1/ai/swap`) với `TimelineItem.jsx` / `SwapPlaceModal.jsx`.
     * Kiểm thử luồng sinh lịch trình và đổi điểm end-to-end trên giao diện, kèm báo lỗi rõ ràng (**🚧 #23**).
* **Tiêu chí hoàn thành (DoD):** Gemini trả về 100% chuẩn JSON trên catalog 327 địa điểm; thời gian phản hồi trung bình 3–5 giây; lịch trình gợi ý hợp lý về địa lý TP.HCM; form tạo lịch trình gọi AI thật và xử lý lỗi minh bạch (`#25`, `#23`).

---

### 6. ĐÀNG MINH HẠO — BACKEND DEVELOPER (ROUTING, TRANSIT & ADAPTIVE)
* **Họ và tên:** **Đàng Minh Hạo**
* **Vai trò chuyên môn:** Backend Developer — Kỹ sư Thuật toán Tuyến đường, Cước xe & Động cơ Thích ứng
* **Trạng thái trên `main`:** **🚧 Đang triển khai (#8/#18)** *(các file backend bên dưới hiện đang rỗng 0 byte trên nhánh `main`; PR `#18` đang mở để review & merge)*
* **Thư mục & File sở hữu chính:**
  * `server/app/utils/transit_calculator.py` — **🚧 Đang triển khai (#8/#18)** (Thuật toán Haversine & Biểu giá cước xe 3 hãng)
  * `server/app/services/contingency_service.py` — **🚧 Đang triển khai (#8/#18)** (Động cơ Kịch bản Thích ứng Trời mưa & Kẹt xe)
  * `server/app/services/calendar_service.py` — **🚧 Đang triển khai (#8/#18)** (Dịch vụ xuất lịch iCalendar `.ICS`)
  * `server/app/schemas/calendar.py` — **🚧 Đang triển khai (#8/#18)** (Pydantic Schema cho Calendar)
  * `server/app/api/v1/endpoints/calendar.py` — **🚧 Đang triển khai (#8/#18)** (API xuất lịch)
  * `client/src/components/itinerary/TransitConnector.jsx`, `client/src/components/common/RidePickerModal.jsx` *(Hợp tác cùng Danh)*
* **Nhiệm vụ cụ thể:**
  1. *Thuật toán Tuyến đường (Haversine Formula):* Tính cự ly đường chim bay và ước lượng khoảng cách đường bộ thực tế giữa các cặp tọa độ GPS chặng đi và chặng đến.
  2. *Thuật toán Ước tính Cước xe 3 Hãng:* Biểu giá Grab (GrabBike/GrabCar), Xanh SM (Bike/Taxi), Be (BeBike/BeCar) theo km và tạo deep-link mở ứng dụng trên điện thoại.
  3. *Động cơ Kịch bản Thích ứng (Adaptive Engine):*
     * **Kịch bản Trời mưa Sài Gòn:** Lọc thay thế các điểm ngoài trời (`is_indoor=False`) sang điểm trong nhà (`is_indoor=True`) cùng quận; chuyển phương thức di chuyển sang xe có mái che.
     * **Kịch bản Giờ cao điểm (17h00 – 19h00):** Cộng thời gian đệm di chuyển và ưu tiên giữ các chặng trong cùng quận.
  4. *Xuất Lịch trình (`.ICS` Calendar):* Xuất file iCalendar `.ICS` chuẩn RFC 5545 kèm thông báo nhắc trước 30 phút để nhập vào Google Calendar, Apple Calendar, Outlook.
  5. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Kết nối API cước xe vào `TransitConnector.jsx`, `RidePickerModal.jsx` và `ExpenseTrackerView.jsx`.
     * Tự test các nút Kịch bản Thích ứng và xuất lịch trên giao diện Web sau khi merge PR `#18`.
* **Tiêu chí hoàn thành (DoD):** Khoảng cách tính toán có sai số dưới 5%; cước ước tính sát thực tế; chuyển đổi kịch bản thích ứng linh hoạt; file `.ICS` nhập vào điện thoại hiển thị chuẩn xác.

---

### 7. ĐOÀN HẢI ĐĂNG — DEVOPS, QA LEAD & THUYẾT TRÌNH DỰ ÁN
* **Họ và tên:** **Đoàn Hải Đăng**
* **Vai trò chuyên môn:** DevOps Engineer, QA Lead & Diễn giả Thuyết trình Dự án
* **Trạng thái trên `main`:** **🚧 Đang triển khai (#9)** *(Docker, CI/CD và phần lớn bộ test Pytest chưa hoàn thiện trên `main`; hiện mới có `server/app/tests/test_places.py` của Đạt và 4 file `.bat` cho Windows)*
* **Thư mục & File sở hữu chính:**
  * `docker-compose.yml` *(hiện rỗng 0 byte)*, `client/Dockerfile`, `server/Dockerfile` — **🚧 Đang triển khai (#9)**
  * `.github/workflows/ci.yml` — **🚧 Đang triển khai (#9)** (Pipeline CI/CD GitHub Actions tự động hóa)
  * `server/app/tests/` — **🚧 Đang triển khai (#9)**: `conftest.py`, `test_auth.py`, `test_trips.py`, `test_ai.py`, `test_transit.py`, `test_calendar.py` *(riêng `server/app/tests/test_places.py` đã có sẵn)*
  * `CHAY-DEMO.bat`, `run_all.bat`, `run_frontend.bat`, `run_backend.bat` *(chỉ dành cho Windows — hợp tác cùng Danh)*
* **Nhiệm vụ cụ thể:**
  1. *Hạ tầng Docker Hóa & Triển khai Cloud (DevOps — **🚧 #9**):* Viết `client/Dockerfile` (multi-stage build), `server/Dockerfile` (Python Uvicorn) và `docker-compose.yml`; hỗ trợ triển khai Cloud (Frontend: Vercel, Backend: Render, Database: Supabase PostgreSQL).
  2. *Đường ống CI/CD Tự động hóa (`.github/workflows/ci.yml` — **🚧 #9**):* Thiết lập GitHub Actions tự động kích hoạt khi có Pull Request để build Frontend, chạy `node --test` (FE) và `pytest` (BE).
  3. *Xây dựng Bộ Mã nguồn Kiểm thử Tự động (Pytest Test Suite — **🚧 #9**):* Bổ sung các file test còn thiếu trong `server/app/tests/` bao phủ Auth, Trips, AI, Transit, Calendar.
  4. *Hoàn thiện Báo cáo Kỹ thuật & Tài liệu Đồ án:* Soạn thảo và chuẩn hóa Báo cáo Kỹ thuật Đồ án theo quy chuẩn Khoa CNTT — ĐHKHTN.
  5. *Thiết kế Slide Thuyết trình & Video Demo:* Biên tập bộ Slide thuyết trình, soạn kịch bản demo 5 phút & bộ câu hỏi phản biện (Q&A), quay Video Demo backup Full HD.
* **Tiêu chí hoàn thành (DoD):** Docker Compose chạy mượt; CI/CD pipeline xanh; toàn bộ bộ test Pytest + `node --test` pass; Báo cáo, Slide và Video demo đạt chuẩn.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
website-ai-travel/
├── .gitignore                     # Loại trừ .env, travel.db, node_modules, .venv, cache
├── docker-compose.yml             # 🚧 Đang triển khai (#9) — hiện đang trống (0 byte)
├── CHAY-DEMO.bat                  # Script khởi chạy demo nhanh (chỉ dành cho Windows)
├── run_all.bat                    # Script chạy đồng thời Frontend + Backend (chỉ dành cho Windows)
├── run_frontend.bat               # Script chạy Frontend (chỉ dành cho Windows)
├── run_backend.bat                # Script chạy Backend FastAPI (chỉ dành cho Windows)
├── start-preview.sh               # Script mở nhanh bản preview trên macOS/Linux
├── README.md                      # Tài liệu tổng quan, hướng dẫn chạy & phân công 7 thành viên
│
├── docs/                          # HỆ THỐNG TÀI LIỆU ĐẶC TẢ (5 FILE)
│   ├── 01-project-spec.md         # Tổng quan, Phạm vi, User Flow & Roadmap
│   ├── 02-architecture-db-ai.md   # Kiến trúc hệ thống, CSDL, Dịch vụ lõi, AI Prompt & Bảo mật
│   ├── 03-ui-ux-design.md         # UI Design System, Wireframes & Responsive
│   ├── 04-testing-deploy-demo.md  # Kiểm thử (Testing), Triển khai (Deploy), Rủi ro & Demo Q&A
│   └── openapi.yaml               # Đặc tả OpenAPI xuất tự động từ FastAPI (/openapi.json)
│
├── client/                        # ỨNG DỤNG FRONTEND (REACT 18 + VITE + TAILWIND + LEAFLET)
│   ├── index.html                 # File HTML gốc (font Be Vietnam Pro)
│   ├── package.json               # Thư viện & scripts (dev, build, test: node --test)
│   ├── vite.config.js             # Cấu hình Vite build
│   ├── tailwind.config.js         # Cấu hình Tailwind CSS theme (#2563EB / #F97316)
│   ├── server.py                  # Máy chủ Python phục vụ SPA tĩnh độc lập (cổng 5173)
│   ├── test/
│   │   └── translations.test.js   # Unit test i18n (chạy bằng: cd client && npm test)
│   └── src/
│       ├── main.jsx               # Entry point ứng dụng
│       ├── App.jsx                # Định tuyến React Router v7 (/, /trips, /trip/:id, /s/:token, /settings)
│       ├── styles.css             # CSS tùy biến & tối ưu Responsive Mobile
│       ├── context/
│       │   └── AuthContext.jsx    # Quản lý trạng thái đăng nhập JWT
│       ├── i18n/
│       │   ├── I18nContext.jsx    # Context đa ngôn ngữ VI/EN
│       │   └── translations.js    # Từ điển song ngữ Anh - Việt
│       ├── pages/
│       │   ├── LandingPage.jsx    # Trang giới thiệu & bắt đầu lập lịch trình
│       │   ├── TripPage.jsx       # Workspace chính 4 Chế độ (Timeline, Đi thực tế, Chi tiêu, Tổng kết)
│       │   ├── MyTripsPage.jsx    # Quản lý danh sách chuyến đi của tôi
│       │   ├── SharedTripPage.jsx # Xem lịch trình được chia sẻ công khai (/s/:token)
│       │   ├── SettingsPage.jsx   # Cài đặt tài khoản & xóa tài khoản
│       │   └── NotFoundPage.jsx   # Trang 404
│       ├── components/
│       │   ├── TripForm.jsx       # Form khảo sát 8 tiêu chí
│       │   ├── AuthModal.jsx      # Modal Đăng nhập / Đăng ký
│       │   ├── ShareDialog.jsx    # Hộp thoại tạo / thu hồi link chia sẻ
│       │   ├── landing/           # Hero3D, MagneticButton, PhotoMarquee, SpotlightCard
│       │   ├── itinerary/
│       │   │   ├── TripMap.jsx          # Bản đồ Leaflet (OpenStreetMap France), marker ✓
│       │   │   ├── TimelineItem.jsx     # Thẻ lịch trình 3 tầng chống tràn chữ
│       │   │   ├── ItineraryPanel.jsx   # Bảng điều khiển lịch trình
│       │   │   ├── PlaceDetailModal.jsx # Modal chi tiết địa điểm TP.HCM
│       │   │   ├── SwapPlaceModal.jsx   # Modal đổi địa điểm thay thế
│       │   │   └── TransitConnector.jsx # Khối hiển thị chặng di chuyển
│       │   ├── companion/
│       │   │   ├── LiveCompanionView.jsx  # Tab 2 Đi thực tế (Hero Card, chỉ đường, check-in)
│       │   │   ├── CheckinModal.jsx       # Modal check-in chụp ảnh & ghi chú
│       │   │   ├── ExpenseTrackerView.jsx # Tab 3 Sổ chi tiêu & sửa cước xe inline
│       │   │   ├── TripSummaryView.jsx    # Tab 4 Tổng kết chuyến đi (4 KPI, album ảnh)
│       │   │   └── TripRecapModal.jsx     # Popup Recap & xuất Thẻ ảnh kỷ niệm Story Card Canvas
│       │   └── common/
│       │       └── RidePickerModal.jsx    # Pop-up đặt xe 3 hãng: Grab, Xanh SM, Be
│       └── lib/
│           ├── api.js             # Client API kết nối Backend (VITE_API_BASE)
│           ├── auth.js            # Lưu/đọc JWT token
│           └── session.js         # Quản lý session ID phía trình duyệt
│
└── server/                        # MÁY CHỦ BACKEND (PYTHON FASTAPI + SQLITE/POSTGRESQL)
    ├── main.py                    # Khởi tạo FastAPI App, lifespan, CORS, gắn Router /api/v1
    ├── requirements.txt           # Thư viện Python (FastAPI, Uvicorn, SQLAlchemy, google-genai...)
    ├── .env.example               # Mẫu biến môi trường (copy → server/.env, KHÔNG commit)
    └── app/
        ├── core/                  # config.py, security.py (bcrypt/JWT), dependencies.py
        ├── db/                    # models.py (4 bảng ORM), session.py, schema.sql, hcmc_data.py (327 điểm)
        ├── schemas/               # user.py, trip.py, ai.py; calendar.py (🚧 #8/#18)
        ├── services/              # gemini_service.py, places_service.py; contingency_service.py & calendar_service.py (🚧 #8/#18)
        ├── utils/                 # transit_calculator.py (🚧 #8/#18)
        ├── tests/                 # test_places.py (đã có); các bộ test còn lại (🚧 #9)
        └── api/v1/
            ├── api.py             # Tổng hợp router prefix /api/v1
            └── endpoints/         # auth.py, trips.py, places.py, ai.py; calendar.py (🚧 #8/#18)
```

---

## 🌿 Quy Chuẩn Phối Hợp Nhóm Trên GitHub

Để đảm bảo quá trình phát triển không xảy ra xung đột mã nguồn:
1. **Nhánh `main`:** Được bảo vệ (*Protected Branch*), chỉ chứa mã nguồn đã kiểm thử ổn định.
2. **Nhánh tính năng cá nhân (*Feature Branches*):**
   * `feature/fe-companion-v2-full` — **Danh** & **Hưng** (Mã nguồn Frontend hoàn chỉnh)
   * `feature/be-auth-trip` — **Khang** (Backend Auth, CRUD Chuyến đi & phiên khách/claim `#31`)
   * `feature/db-schema-seed` — **Đạt** (SQLAlchemy ORM, SQLite/PostgreSQL, 327 địa điểm & Cache)
   * `feature/ai-gemini-flow` — **Lam** (Gemini AI, tích hợp form `#25` & xử lý lỗi `#23`)
   * `feature/be-transit-adaptive` — **Hạo** (Routing cước 3 xe, Kịch bản thích ứng & Calendar `#8/#18`)
   * `feature/devops-docker-ci` — **Đăng** (Docker, CI/CD, Pytest & Triển khai Cloud `#9`)
3. **Quy tắc Merge:** Mọi thành viên sau khi hoàn thành tính năng phải mở Pull Request (PR) vào nhánh `main` và được Trưởng nhóm (Danh) phê duyệt sau khi đã test không xung đột.
