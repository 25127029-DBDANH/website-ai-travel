# 🧭 SÀI GÒN GUIDE — TRỢ LÝ AI LẬP KẾ HOẠCH DU LỊCH TP. HỒ CHÍ MINH
## ĐỒ ÁN MÔN HỌC: TƯ DUY TÍNH TOÁN (CSC10014) — HCMUS
> **Trường Đại học Khoa học Tự nhiên — ĐHQG-HCM | Khoa Công Nghệ Thông Tin**  
> **Nhóm thực hiện:** Nhóm 7 (7 thành viên)  
> **Kho mã nguồn chính thức:** [`https://github.com/25127029-DBDANH/website-ai-travel`](https://github.com/25127029-DBDANH/website-ai-travel)  
> **Phiên bản:** Hoàn thiện v2.0 (4 Chế độ Trải nghiệm, Đồng hành Thời gian thực & Tích hợp Gọi xe 3 Hãng)

---

## 🌟 Tổng Quan Về Dự Án

**Sài Gòn Guide** là nền tảng web thông minh ứng dụng Trí tuệ nhân tạo (Google Gemini) chuyên sâu cho du lịch bản địa tại Thành phố Hồ Chí Minh. Hệ thống đồng hành trọn vẹn cùng du khách qua toàn bộ hành trình khép kín: từ lúc **lên kế hoạch cá nhân hóa**, **tinh chỉnh lịch trình trên bản đồ số**, **đồng hành thời gian thực ngoài thực địa (Live Companion)**, **quản lý chi tiêu & cước xe di chuyển**, cho đến **tổng kết chuyến đi và xuất thẻ ảnh kỷ niệm (Story Card)**.

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
│ • Marker biến thành ✓│ • Check-in chụp ảnh  │ • Lọc danh mục tiền  │   Story Card Canvas (9:16) │
└──────────────────────┴──────────────────────┴──────────────────────┴────────────────────────────┘
```

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (1-Click Run)

### Cách 1: Khởi chạy Trực tiếp Siêu Tốc (Khuyên dùng cho Giảng viên & Hội đồng)
Dự án đã được tích hợp sẵn máy chủ phục vụ bản build hoàn chỉnh mà không cần cài đặt `node_modules`:
1. Nhấp đúp chuột vào file: `CHAY-DEMO.bat` ở thư mục gốc.
2. Trình duyệt Google Chrome sẽ tự động mở trang demo tại: **`http://localhost:5173/trip/demo`**.
3. Toàn bộ 4 chế độ tương tác, bản đồ Leaflet, tích hợp 3 hãng gọi xe và sổ chi tiêu sẵn sàng trải nghiệm 100%.

### Cách 2: Khởi chạy Môi trường Phát triển Frontend (Dev Mode)
```bash
cd client
npm install
npm run dev
# Mở trình duyệt tại: http://localhost:5173
```

### Cách 3: Khởi chạy Máy chủ Backend FastAPI
```bash
cd server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Xem tài liệu API tương tác tại Swagger UI: http://localhost:8000/docs
```

### Cách 4: Khởi chạy bằng Docker Compose
```bash
docker compose up --build
```

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
| **Frontend: Lịch trình Timeline 3 tầng & Thanh điều hướng** | `client/src/components/itinerary/TimelineItem.jsx`, `ItineraryPanel.jsx` | **Diệp Bảo Danh** |
| **Frontend: Chế độ Đi thực tế & Modal Check-in ảnh** | `client/src/components/companion/LiveCompanionView.jsx`, `CheckinModal.jsx` | **Diệp Bảo Danh** |
| **Frontend: Cấu trúc Client API Gateway & Server Demo** | `client/src/lib/api.js`, `client/server.py` | **Diệp Bảo Danh** |
| **Frontend: Sổ chi tiêu, Cước xe inline & Báo cáo Tổng kết** | `client/src/components/companion/ExpenseTrackerView.jsx`, `TripSummaryView.jsx` | **Phạm Gia Hưng** |
| **Frontend: Xuất Thẻ kỷ niệm Canvas & Popup Recap** | `client/src/components/companion/TripRecapModal.jsx`, `StoryCardCanvas` | **Phạm Gia Hưng** |
| **Frontend: Form khảo sát 8 tiêu chí & Landing Page 3D** | `client/src/components/TripForm.jsx`, `LandingPage.jsx`, `components/landing/*` | **Phạm Gia Hưng** |
| **Frontend: Quản lý Chuyến của tôi & Cài đặt Profile** | `client/src/pages/MyTripsPage.jsx`, `client/src/pages/SettingsPage.jsx` | **Phạm Gia Hưng** |
| **Frontend: Hệ thống Đa ngôn ngữ Song ngữ Anh - Việt** | `client/src/i18n/I18nContext.jsx`, `client/src/i18n/translations.js` | **Phạm Gia Hưng** |
| **Frontend: Tích hợp Đăng nhập, Google Sign-In & Auth State** | `client/src/components/AuthModal.jsx`, `context/AuthContext.jsx`, `lib/auth.js` | **Đỗ Nguyễn An Khang** *(Tự tích hợp)* |
| **Frontend: Tích hợp Trang xem chuyến đi công khai** | `client/src/pages/SharedTripPage.jsx`, `client/src/components/ShareDialog.jsx` | **Đỗ Nguyễn An Khang** *(Tự tích hợp)* |
| **Frontend: Tích hợp Modal Chi tiết địa điểm TP.HCM** | `client/src/components/itinerary/PlaceDetailModal.jsx` | **Ngô Tấn Đạt** *(Tự tích hợp)* |
| **Frontend: Tích hợp Cước xe 3 hãng & Khối di chuyển chặng** | `client/src/components/itinerary/TransitConnector.jsx`, `RidePickerModal.jsx` | **Đàng Minh Hạo & Diệp Bảo Danh** |
| **Backend: Khung FastAPI, Core Security & JWT Dependency** | `server/main.py`, `server/app/core/security.py`, `config.py`, `dependencies.py` | **Đỗ Nguyễn An Khang** |
| **Backend: Pydantic Schemas & Endpoints Auth / Trips** | `server/app/schemas/user.py`, `trip.py`, `endpoints/auth.py`, `trips.py` | **Đỗ Nguyễn An Khang** |
| **Backend: Lược đồ CSDL PostgreSQL, Session & Data TP.HCM** | `server/app/db/schema.sql`, `session.py`, `hcmc_data.py` | **Ngô Tấn Đạt** |
| **Backend: Places Cache TTL 7 ngày & Endpoints Places** | `server/app/services/places_service.py`, `endpoints/places.py` | **Ngô Tấn Đạt** |
| **Backend: SDK Gemini 2.5 Flash, Prompt & Endpoints AI** | `server/app/services/gemini_service.py`, `schemas/ai.py`, `endpoints/ai.py` | **Lê Hữu Lam** |
| **Backend: Thuật toán Haversine, Cước xe Grab/XanhSM/Be** | `server/app/utils/transit_calculator.py` | **Đàng Minh Hạo** |
| **Backend: Động cơ Kịch bản Thích ứng Trời mưa & Kẹt xe** | `server/app/services/contingency_service.py` | **Đàng Minh Hạo** |
| **Backend: Dịch vụ Calendar .ICS & REST API Google Calendar** | `server/app/services/calendar_service.py`, `endpoints/calendar.py` | **Đàng Minh Hạo** |
| **DevOps: Docker Compose & Dockerfiles Multi-stage** | `docker-compose.yml`, `client/Dockerfile`, `server/Dockerfile` | **Đoàn Hải Đăng** |
| **DevOps: Pipeline CI/CD GitHub Actions Tự động hóa** | `.github/workflows/ci.yml` | **Đoàn Hải Đăng** |
| **QA/Test: Toàn bộ Bộ mã nguồn Kiểm thử tự động Pytest** | `server/app/tests/conftest.py`, `test_auth.py`, `test_trips.py`, `test_places.py`... | **Đoàn Hải Đăng** |
| **DevOps: Hệ thống Script Windows 1-Click Execution** | `CHAY-DEMO.bat`, `run_all.bat`, `run_frontend.bat`, `run_backend.bat` | **Đoàn Hải Đăng & Diệp Bảo Danh** |

---

### 1. DIỆP BẢO DANH — FRONTEND LEAD & SYSTEM ARCHITECT (TRƯỞNG NHÓM)
* **Họ và tên:** **Diệp Bảo Danh**
* **Mã số sinh viên (MSSV):** `25127029`
* **Vai trò chuyên môn:** Trưởng nhóm — Kiến trúc sư Hệ thống & Lead Frontend
* **Thư mục & File sở hữu chính:**
  * `client/src/pages/TripPage.jsx` (Điều phối 4 chế độ tab, state đồng bộ giữa bản đồ & timeline)
  * `client/src/components/itinerary/TripMap.jsx` (Khung 1 Bản đồ Leaflet tương tác, marker số [1,2,3,4], polyline, đổi pin sang dấu tích xanh `✓`)
  * `client/src/components/itinerary/TimelineItem.jsx` (Khung 2 Thẻ lịch trình 3 tầng chống tràn/đè chữ, chốt Accept, Swap)
  * `client/src/components/itinerary/ItineraryPanel.jsx` (Thanh điều khiển lịch trình tối ưu, dọn nút trùng lặp)
  * `client/src/components/companion/LiveCompanionView.jsx` (Tab 2 Chế độ Đi thực tế thời gian thực, thẻ Hero Next Stop, hoàn thành chuyến đi)
  * `client/src/components/companion/CheckinModal.jsx` (Modal check-in chặng, tải ảnh lưu niệm, ghi chú)
  * `client/src/lib/api.js` (Cấu trúc Gateway API trung tâm kết nối Backend)
  * `client/server.py` & `CHAY-DEMO.bat` (Server phục vụ Single Page Demo và script 1-click)
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
  * `client/src/components/companion/TripRecapModal.jsx` (Modal chúc mừng hoàn thành chuyến đi)
  * `client/src/components/TripForm.jsx` (Form khảo sát 8 tiêu chí chuyên sâu)
  * `client/src/pages/LandingPage.jsx` & `client/src/components/landing/*` (`Hero3D.jsx`, `PhotoMarquee.jsx`, `SpotlightCard.jsx`)
  * `client/src/pages/MyTripsPage.jsx` (Trang "Chuyến của tôi", danh sách chuyến đi, lọc trạng thái, nhân bản)
  * `client/src/pages/SettingsPage.jsx` (Trang Cài đặt tài khoản, Travel Profile AI, liên kết Google Calendar, Dark mode)
  * `client/src/i18n/I18nContext.jsx` & `client/src/i18n/translations.js` (Hệ thống Đa ngôn ngữ VI/EN)
* **Nhiệm vụ cụ thể:**
  1. *Tab 3 Sổ chi tiêu & Quản lý di chuyển:* Hiển thị chi tiết tiền vé tham quan, ăn uống và **từng chặng xe di chuyển**; tính năng bấm sửa cước xe trực tiếp (*Inline fare editing*); bộ lọc danh mục và thanh tiến độ ngân sách.
  2. *Tab 4 Giao diện Tổng kết chuyến đi:* Thống kê 4 chỉ số KPI cốt lõi (Tổng chi phí, Chênh lệch ngân sách, Số điểm đã ghé, Tổng cự ly); biểu đồ cơ cấu chi tiêu 3 nhóm; album ảnh check-in thực tế.
  3. *Xuất Thẻ kỷ niệm (Story Card Canvas):* Lập trình sinh ảnh đồ họa tổng kết chuyến đi (tỷ lệ 9:16 Story / 1:1 Square) cho phép bấm tải ảnh về máy để chia sẻ mạng xã hội.
  4. *Form khảo sát 8 tiêu chí chuyên sâu:* Xây dựng giao diện thu thập nhu cầu du khách kết nối trực tiếp AI Generator.
  5. *Trang My Trips & Settings:* Lập trình giao diện quản lý các chuyến đi đã lưu, nhân bản chuyến đi, xem hồ sơ du lịch AI (Travel Profile) và bật tắt Chế độ Sáng/Tối.
  6. *Hệ thống Đa ngôn ngữ (VI/EN) & Responsive Mobile:* Đảm bảo 100% nhãn giao diện chuẩn ngữ nghĩa Anh - Việt; tối ưu giao diện không vỡ khung trên Smartphone ngoài trời.
* **Tiêu chí hoàn thành (DoD):** Sổ chi tiêu tính toán tiền chính xác; xuất ảnh Story Card sắc nét; giao diện responsive mượt mà trên iPhone/Android.

---

### 3. ĐỖ NGUYỄN AN KHANG — BACKEND LEAD & AUTHENTICATION SERVICE
* **Họ và tên:** **Đỗ Nguyễn An Khang**
* **Vai trò chuyên môn:** Backend Lead & Kỹ sư Dịch vụ Xác thực & Quản trị Chuyến đi
* **Thư mục & File sở hữu chính:**
  * `server/main.py` (File khởi chạy FastAPI, cấu hình CORS, Global Exception Handler)
  * `server/app/api/v1/api.py` (Router tổng hợp API v1)
  * `server/app/core/config.py`, `security.py`, `dependencies.py` (Cấu hình môi trường `.env`, mã hóa bcrypt, JWT Bearer)
  * `server/app/schemas/user.py`, `trip.py` (Pydantic models)
  * `server/app/api/v1/endpoints/auth.py` (Đăng ký, đăng nhập mật khẩu, Google OAuth 2.0)
  * `server/app/api/v1/endpoints/trips.py` (CRUD chuyến đi, `GET /trips/me`, `POST /trips/{id}/clone`, `POST /share`)
  * `client/src/pages/SharedTripPage.jsx` *(Tự tích hợp)*
* **Nhiệm vụ cụ thể:**
  1. *Khung dự án FastAPI:* Dựng cấu trúc mã nguồn Backend chuẩn RESTful; cấu hình CORS cho phép kết nối an toàn từ Frontend; thiết lập bắt lỗi ngoại lệ tập trung.
  2. *Hệ thống Xác thực (Auth Service):* Mã hóa mật khẩu bằng `bcrypt`; cấp phát và xác thực JWT Bearer Token theo RFC 7519 trong Dependency `get_current_user`; tích hợp Google OAuth 2.0.
  3. *Bộ API Quản lý Chuyến đi:* Lưu chuyến đi mới tạo từ AI; lấy dữ liệu chi tiết lịch trình; cập nhật trạng thái chặng (`visited`, ghi chú, ảnh); lấy danh sách chuyến đi của user; sao chép nhân bản chuyến đi; API chia sẻ link công khai ẩn thông tin nhạy cảm.
  4. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Kết nối API đăng nhập/đăng ký vào `AuthModal.jsx` và `AuthContext.jsx`.
     * Kết nối danh sách chuyến đi vào `MyTripsPage.jsx`.
     * Kết nối trang chia sẻ công khai vào `SharedTripPage.jsx`.
     * Tự test luồng đăng nhập, lưu chuyến đi và chia sẻ link công khai cho tới khi chạy thông suốt.
* **Tiêu chí hoàn thành (DoD):** Xác thực an toàn 100%; bảo vệ route chặt chẽ; CRUD chuyến đi phản hồi dưới 100ms; luồng E2E trên Web hoạt động hoàn hảo.

---

### 4. NGÔ TẤN ĐẠT — DATABASE & DATA ENGINEER
* **Họ và tên:** **Ngô Tấn Đạt**
* **Vai trò chuyên môn:** Kỹ sư Cơ sở Dữ liệu & Quản trị Dữ liệu Địa điểm Sài Gòn
* **Thư mục & File sở hữu chính:**
  * `server/app/db/schema.sql` (Lược đồ CSDL PostgreSQL)
  * `server/app/db/session.py` (Cấu hình SQLAlchemy Engine & SessionLocal)
  * `server/app/db/hcmc_data.py` (Kho dữ liệu Seed 30+ địa điểm TP.HCM)
  * `server/app/services/places_service.py` (Bộ đệm Cache TTL 7 ngày & Fallback Places API)
  * `server/app/api/v1/endpoints/places.py` (Bộ API địa điểm TP.HCM)
  * `client/src/components/itinerary/PlaceDetailModal.jsx` *(Tự tích hợp)*
* **Nhiệm vụ cụ thể:**
  1. *Lược đồ CSDL Quan hệ:* Thiết kế các bảng `users`, `trips`, `trip_days`, `itinerary_items`, `expenses`, `places_cache` với ràng buộc khóa ngoại (Foreign Keys) và Indexes tăng tốc truy vấn.
  2. *Bộ đệm Địa điểm (Places Cache TTL 7 ngày):* Xây dựng cơ chế cache địa điểm trong bảng `places_cache`; tự động hoàn trả dữ liệu từ CSDL cục bộ; chỉ gọi Google Places API New khi cache miss hoặc dữ liệu quá hạn 7 ngày.
  3. *Tập dữ liệu Mồi TP.HCM (`hcmc_data.py`):* Thu thập, làm sạch và chuẩn hóa hơn 30+ địa danh nổi tiếng Sài Gòn đầy đủ tọa độ GPS, mức giá, thời lượng tham quan, ảnh chất lượng cao.
  4. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Đảm bảo dữ liệu từ DB hiển thị đầy đủ trên Bản đồ Leaflet (`TripMap.jsx`).
     * Tự kết nối API chi tiết địa điểm vào `PlaceDetailModal.jsx` (ảnh, mô tả, giờ mở cửa).
     * Tự test truy vấn dữ liệu địa điểm hiển thị chính xác trên giao diện Frontend.
* **Tiêu chí hoàn thành (DoD):** CSDL triển khai hoàn tất trên PostgreSQL/Supabase; script seed nạp dữ liệu chạy 100% thành công; query địa điểm phản hồi dưới 30ms.

---

### 5. LÊ HỮU LAM — AI ENGINE & PROMPT ENGINEER
* **Họ và tên:** **Lê Hữu Lam**
* **Vai trò chuyên môn:** Kỹ sư Trí tuệ Nhân tạo & Kỹ thuật Prompt (Google Gemini Integration)
* **Thư mục & File sở hữu chính:**
  * `server/app/schemas/ai.py` (Pydantic Schema ràng buộc Gemini Structured Output JSON)
  * `server/app/services/gemini_service.py` (SDK Gemini 2.5 Flash, Prompt Engineering chuyên sâu)
  * `server/app/api/v1/endpoints/ai.py` (API `/api/v1/ai/generate` và `/api/v1/ai/swap`)
* **Nhiệm vụ cụ thể:**
  1. *Tích hợp Google Gemini API:* Cấu hình SDK Gemini (`gemini-2.5-flash`), quản lý API Key an toàn, xử lý Rate Limiting, Exponential Backoff Retry và kịch bản Fallback khi mất kết nối.
  2. *Kỹ thuật Prompt Chuyên gia Bản địa:* Soạn thảo System Instruction định vị AI am hiểu sâu sắc văn hóa, ẩm thực từng con hẻm Sài Gòn; kỹ thuật Few-shot Prompting cân đối múi giờ sinh hoạt thực tế.
  3. *Gemini Structured Outputs:* Ràng buộc chặt chẽ JSON Schema đầu ra, đảm bảo 100% phản hồi từ Gemini trả về JSON chuẩn xác theo cấu trúc Frontend cần, không bị lỗi text tự do.
  4. *Động cơ Sinh Lịch trình Tối ưu:* Tiếp nhận 8 tiêu chí khảo sát -> Lựa chọn địa điểm theo cụm quận nhằm giảm thiểu thời gian di chuyển -> Phân bổ ngân sách hợp lý theo ngày.
  5. *Logic AI Đổi địa điểm thông minh (Smart Swap):* API `POST /api/v1/ai/swap` phân tích lý do đổi điểm của người dùng và đề xuất 2-3 địa điểm thay thế tương đương cùng khu vực và chi phí.
  6. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Tự kết nối API sinh lịch trình vào `TripForm.jsx`.
     * Tự kết nối API Smart Swap vào `TimelineItem.jsx` (modal đổi địa điểm).
     * Tự kiểm thử luồng sinh lịch trình và đổi điểm trực tiếp trên giao diện cho đến khi dữ liệu trả về mượt mà.
* **Tiêu chí hoàn thành (DoD):** Gemini trả về 100% chuẩn JSON; thời gian phản hồi AI trung bình dưới 3-5 giây; lịch trình gợi ý logic, hợp lý về địa lý TP.HCM.

---

### 6. ĐÀNG MINH HẠO — BACKEND DEVELOPER (ROUTING, TRANSIT & ADAPTIVE)
* **Họ và tên:** **Đàng Minh Hạo**
* **Vai trò chuyên môn:** Backend Developer — Kỹ sư Thuật toán Tuyến đường, Cước xe & Động cơ Thích ứng
* **Thư mục & File sở hữu chính:**
  * `server/app/utils/transit_calculator.py` (Thuật toán Haversine & Biểu giá cước xe 3 hãng)
  * `server/app/services/contingency_service.py` (Động cơ Kịch bản Thích ứng Trời mưa & Kẹt xe)
  * `server/app/services/calendar_service.py` (Dịch vụ Calendar .ICS & REST API Google Calendar)
  * `server/app/schemas/calendar.py` (Pydantic Schema cho Calendar)
  * `server/app/api/v1/endpoints/calendar.py` (API xuất lịch)
  * `client/src/components/common/RidePickerModal.jsx` *(Hợp tác Danh)*
* **Nhiệm vụ cụ thể:**
  1. *Thuật toán Tuyến đường (Haversine Formula):* Tính toán cự ly đường chim bay và ước lượng khoảng cách đường bộ thực tế giữa các cặp tọa độ GPS chặng đi và chặng đến.
  2. *Thuật toán Ước tính Cước xe 3 Hãng:*
     * Grab: Biểu giá GrabBike & GrabCar theo km.
     * Xanh SM: Biểu giá Xanh SM Bike & Xanh SM Taxi (xe điện VinFast).
     * Be: Biểu giá BeBike & BeCar.
     * Tạo deep-link mở ứng dụng tương ứng trên điện thoại.
  3. *Động cơ Kịch bản Thích ứng (Adaptive Engine):*
     * **Kịch bản Trời mưa Sài Gòn:** Tự động lọc thay thế các điểm ngoài trời thành điểm có mái che/bảo tàng/trung tâm thương mại; chuyển đổi phương thức di chuyển sang taxi có mái che.
     * **Kịch bản Giờ cao điểm (17h00 - 19h00):** Tự động cộng thêm 15-30 phút thời gian đệm di chuyển và ưu tiên giữ các chặng trong cùng 1 quận để tránh kẹt xe.
  4. *Đồng bộ Lịch trình (Calendar Integration):* Xuất file iCalendar `.ICS` chuẩn RFC 5545 cho phép nhập vào Google Calendar, Apple Calendar, Outlook kèm thông báo nhắc trước 30 phút; kết nối Google Calendar REST API đồng bộ sự kiện vào lịch cá nhân của người dùng.
  5. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Kết nối cước xe vào `TransitConnector.jsx` và `RidePickerModal.jsx`.
     * Tự động đẩy chi phí di chuyển các chặng vào `ExpenseTrackerView.jsx`.
     * Tự test các nút Kịch bản Thích ứng và Đồng bộ Calendar trên giao diện Web.
* **Tiêu chí hoàn thành (DoD):** Khoảng cách tính toán có sai số dưới 5%; cước ước tính sát thực tế; chuyển đổi kịch bản thích ứng linh hoạt; file `.ICS` nhập vào điện thoại hiển thị chuẩn xác.

---

### 7. ĐOÀN HẢI ĐĂNG — DEVOPS, QA LEAD & THUYẾT TRÌNH DỰ ÁN
* **Họ và tên:** **Đoàn Hải Đăng**
* **Vai trò chuyên môn:** DevOps Engineer, QA Lead & Diễn giả Thuyết trình Dự án
* **Thư mục & File sở hữu chính:**
  * `docker-compose.yml` (Điều phối chạy toàn bộ hệ sinh thái Web)
  * `client/Dockerfile` & `server/Dockerfile` (Multi-stage build Docker images)
  * `.github/workflows/ci.yml` (Pipeline CI/CD GitHub Actions tự động hóa)
  * `server/app/tests/conftest.py` (Cấu hình Pytest Fixtures, Mock TestClient)
  * `server/app/tests/test_auth.py` (Kiểm thử tự động Auth Service)
  * `server/app/tests/test_trips.py` (Kiểm thử tự động CRUD Chuyến đi)
  * `server/app/tests/test_places.py` (Kiểm thử tự động Cache & Dữ liệu Địa điểm)
  * `server/app/tests/test_ai.py` (Kiểm thử tự động Gemini Structured Schema)
  * `server/app/tests/test_transit.py` (Kiểm thử tự động Cước xe & Haversine)
  * `server/app/tests/test_calendar.py` (Kiểm thử tự động Cú pháp iCalendar .ICS)
  * `CHAY-DEMO.bat`, `run_all.bat`, `run_frontend.bat`, `run_backend.bat` (Hệ thống script 1-Click Execution)
* **Nhiệm vụ cụ thể:**
  1. *Hạ tầng Docker Hóa & Triển khai Cloud (DevOps):* Viết `client/Dockerfile` (multi-stage build) và `server/Dockerfile` (Python Uvicorn); viết `docker-compose.yml` cho phép chạy trọn gói cả hệ sinh thái (Frontend + Backend + PostgreSQL) với đúng 1 câu lệnh `docker compose up`; triển khai hệ thống lên Cloud (Frontend: Vercel, Backend: Render, Database: Supabase).
  2. *Đường ống CI/CD Tự động hóa (`.github/workflows/ci.yml`):* Thiết lập GitHub Actions tự động kích hoạt khi có Pull Request: Kiểm tra format code, build bundle Frontend và chạy bộ kiểm thử Backend.
  3. *Xây dựng Bộ Mã nguồn Kiểm thử Tự động (Pytest Test Suite):* Viết trọn bộ test cases bao phủ toàn bộ các mô-đun nghiệp vụ trong thư mục `server/app/tests/`; đảm bảo test suite chạy vượt qua 100% với báo cáo độ bao phủ mã nguồn (Coverage Report).
  4. *Hoàn thiện Báo cáo Kỹ thuật & Tài liệu Đồ án:* Soạn thảo và chuẩn hóa Báo cáo Kỹ thuật Đồ án (Word/PDF) theo quy chuẩn hình thức của Khoa CNTT - ĐHKHTN.
  5. *Thiết kế Slide Thuyết trình & Video Demo:* Biên tập bộ Slide thuyết trình chuyên nghiệp bằng Tiếng Anh (hoặc Song ngữ); soạn kịch bản thuyết trình và phân bổ câu hỏi phản biện (Q&A) với Giảng viên; quay và dựng Video Demo Full HD (3-5 phút) thuyết minh rõ ràng các tính năng độc đáo của đồ án.
* **Tiêu chí hoàn thành (DoD):** Docker compose chạy mượt mà; CI/CD pipeline xanh 100%; bộ test cases Pytest pass toàn bộ; Báo cáo, Slide và Video demo đạt chuẩn xuất sắc.

---

## 📁 Cấu Trúc Thư Mục Dự Án Hoàn Chỉnh

```
website-ai-travel/
├── .gitignore                     # Cấu hình loại trừ file nhị phân, node_modules, cache
├── docker-compose.yml             # Cấu hình container dịch vụ
├── CHAY-DEMO.bat                  # Script 1-CLICK chạy ngay bản demo cho giảng viên
├── run_all.bat                    # Script chạy đồng thời cả Frontend và Backend
├── run_frontend.bat               # Script chạy máy chủ Frontend
├── run_backend.bat                # Script chạy máy chủ Backend FastAPI
├── README.md                      # Tài liệu tổng quan, cấu trúc dự án & phân công 7 thành viên
│
├── docs/                          # HỆ THỐNG TÀI LIỆU ĐẶC TẢ CHUẨN HÓA
│   ├── yeu-cau-moi.md             # Đặc tả chi tiết 7 yêu cầu cốt lõi & yêu cầu nâng cấp v2
│   ├── user-flow.md               # Sơ đồ Mermaid luồng trải nghiệm người dùng 6 giai đoạn
│   ├── ke-hoach-thuc-hien.md      # Bảng phân công RACI, danh mục WBS và Definition of Done
│   ├── kien-truc-api-db.md        # Kiến trúc hệ thống, ERD CSDL và danh mục RESTful API
│   ├── openapi.yaml               # Đặc tả kỹ thuật OpenAPI 3.0 cho toàn bộ hệ thống API
│   ├── 04-prompt-ai-flow.md       # Thiết kế prompt Gemini & kỹ thuật sinh lịch trình chuẩn
│   ├── 08-testing.md              # Kế hoạch kiểm thử chất lượng và test cases
│   ├── 09-deploy.md               # Hướng dẫn đóng gói Docker và triển khai Cloud
│   └── 13-demo-qa.md              # Kịch bản Live Demo 5 phút và câu hỏi phản biện bảo vệ đồ án
│
├── client/                        # ỨNG DỤNG FRONTEND (REACT 18 + VITE + TAILWIND CSS)
│   ├── index.html                 # File HTML gốc
│   ├── package.json               # Khai báo thư viện (React, Leaflet, Lucide, Motion, Tailwind)
│   ├── vite.config.js             # Cấu hình Vite build
│   ├── tailwind.config.js         # Cấu hình Tailwind CSS theme
│   ├── server.py                  # Máy chủ Python phục vụ SPA tĩnh độc lập (cổng 5173)
│   ├── dist/                      # Bản build production tối ưu sẵn sàng chạy tức thì
│   └── src/
│       ├── main.jsx               # Entry point ứng dụng
│       ├── App.jsx                # Định tuyến React Router v7
│       ├── styles.css             # CSS tùy biến & tối ưu Responsive Mobile
│       ├── pages/
│       │   ├── TripPage.jsx       # Màn hình chính điều phối 4 Chế độ (Timeline, Đi thực tế, Chi tiêu, Tổng kết)
│       │   ├── LandingPage.jsx    # Trang giới thiệu cho khách vãng lai
│       │   ├── MyTripsPage.jsx    # Quản lý danh sách chuyến đi của tôi
│       │   └── SharedTripPage.jsx # Xem lịch trình được chia sẻ công khai qua liên kết
│       ├── components/
│       │   ├── itinerary/
│       │   │   ├── TripMap.jsx        # Bản đồ Leaflet Khung 1, marker tích xanh ✓
│       │   │   ├── TimelineItem.jsx   # Thẻ lịch trình Khung 2 cấu trúc 3 tầng chống tràn chữ
│       │   │   └── ItineraryPanel.jsx # Bảng điều khiển lịch trình tối ưu
│       │   ├── companion/
│       │   │   ├── LiveCompanionView.jsx  # Tab 2 Chế độ Đi thực tế (Hero Card, Check-in)
│       │   │   ├── ExpenseTrackerView.jsx # Tab 3 Sổ chi tiêu & Di chuyển (sửa tiền inline)
│       │   │   ├── TripSummaryView.jsx    # Tab 4 Màn hình Tổng kết chuyến đi (4 KPI, album ảnh)
│       │   │   └── StoryCardModal.jsx     # Xuất Thẻ ảnh kỷ niệm Canvas
│       │   └── common/
│       │       └── RidePickerModal.jsx    # Pop-up đặt xe 3 hãng: Grab, Xanh SM, Be
│       └── lib/
│           ├── api.js             # Client API kết nối Backend (kèm mock dữ liệu an toàn)
│           └── story-card.js      # Thư viện vẽ đồ họa Canvas xuất thẻ ảnh Story Card
│
└── server/                        # MÁY CHỦ BACKEND (PYTHON FASTAPI + POSTGRESQL)
    ├── main.py                    # Khởi tạo FastAPI App, CORS và gắn Router V1
    ├── requirements.txt           # Danh mục thư viện Python (FastAPI, Uvicorn, Pydantic, SQLAlchemy)
    ├── .env.example               # Mẫu biến môi trường (Database URL, Gemini API Key, JWT Secret)
    └── app/
        ├── core/                  # Cấu hình hệ thống, bảo mật bcrypt và JWT
        ├── db/                    # Schema CSDL PostgreSQL, Session và Seed Data 30+ địa điểm TP.HCM
        ├── schemas/               # Pydantic Schemas kiểm thực dữ liệu đầu vào/ra
        ├── services/              # Xử lý nghiệp vụ thông minh: Gemini AI, Cache địa điểm, Transit, Lịch .ICS
        ├── utils/                 # Thuật toán Haversine tính cự ly & cước 3 hãng xe
        └── api/v1/endpoints/      # Các Router RESTful API: Auth, Trips, AI, Places, Calendar, Transit
```

---

## 🌿 Quy Chuẩn Phối Hợp Nhóm Trên GitHub

Để đảm bảo quá trình phát triển không xảy ra xung đột mã nguồn:
1. **Nhánh `main`:** Được bảo vệ (*Protected Branch*), chỉ chứa mã nguồn đã kiểm thử ổn định 100%.
2. **Nhánh `dev`:** Nhánh tích hợp chung của toàn nhóm.
3. **Nhánh tính năng cá nhân (*Feature Branches*):**
   * `feature/fe-companion-v2-full` — **Danh** & **Hưng** (Mã nguồn Frontend hoàn chỉnh)
   * `feature/be-auth-trip` — **Khang** (Backend Auth & CRUD Chuyến đi)
   * `feature/db-schema-seed` — **Đạt** (Database PostgreSQL & Cache địa điểm)
   * `feature/ai-gemini-flow` — **Lam** (Gemini AI & Tối ưu lịch trình)
   * `feature/be-transit-adaptive` — **Hạo** (Routing cước 3 xe & Kịch bản thích ứng)
   * `feature/devops-docker-ci` — **Đăng** (Docker, Pytest & Triển khai Cloud)
4. **Quy tắc Merge:** Mọi thành viên sau khi hoàn thành tính năng phải mở Pull Request (PR) vào nhánh `dev` và được Trưởng nhóm (Danh) phê duyệt sau khi đã test không xung đột.
