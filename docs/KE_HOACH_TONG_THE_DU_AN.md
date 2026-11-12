# 👥 BẢNG PHÂN CÔNG NHIỆM VỤ ĐỒ ÁN MÔN HỌC (NHÓM 7) — BẢN RÀ SOÁT MÃ NGUỒN HOÀN CHỈNH
## ĐỒ ÁN: WEBSITE AI LẬP KẾ HOẠCH DU LỊCH TP. HỒ CHÍ MINH (*SÀI GÒN GUIDE*)
**Môn học:** Tư Duy Tính Toán (CSC10014) — Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM  
**Kho mã nguồn GitHub:** [`https://github.com/25127029-DBDANH/website-ai-travel`](https://github.com/25127029-DBDANH/website-ai-travel)  
**Thời gian cập nhật:** 12/11/2026 (Đã rà soát & bổ sung 100% nhiệm vụ mã nguồn)

---

> [!IMPORTANT]
> **NGUYÊN TẮC PHÂN CÔNG CỐT LÕI CỦA ĐỒ ÁN:**
> 1. **Diệp Bảo Danh (Trưởng nhóm - MSSV: 25127029)** và **Phạm Gia Hưng** **cố định phụ trách toàn diện mảng Front-end**.
> 2. Các thành viên phụ trách Backend/AI/Data (**Khang, Đạt, Lam, Hạo**) chịu trách nhiệm **tự tích hợp trực tiếp API vào Frontend và tự kiểm thử (E2E Testing)** cho đến khi tính năng vận hành trơn tru trên giao diện người dùng.
> 3. **Đoàn Hải Đăng** chịu trách nhiệm toàn diện về **Mã nguồn Hạ tầng DevOps (Docker, CI/CD GitHub Actions), Bộ mã nguồn Kiểm thử tự động (Pytest Test Suite), Báo cáo Kỹ thuật và Thuyết trình/Video Demo**.
> 4. **MỌI TÍNH NĂNG VÀ FILE CODE ĐỀU CÓ CHỦ SỞ HỮU RÕ RÀNG (100% OWNERSHIP)**: Tuyệt đối không để sót bất kỳ file cấu hình, component, endpoint hay script kiểm thử nào.

---

## I. BẢNG TỔNG QUAN PHÂN CÔNG 7 THÀNH VIÊN (KÈM MÃ NGUỒN CỤ THỂ)

| STT | Thành viên | Vai trò / Chức danh | Mảng phụ trách chính | Danh mục File Mã nguồn (Code Files) sở hữu chính | Nhiệm vụ Tự tích hợp & Bàn giao E2E |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Diệp Bảo Danh**<br>*(Trưởng nhóm - 25127029)* | **Frontend Lead & System Architect** | Bản đồ tương tác, Lịch trình 3 tầng, Chế độ Đi thực tế, Gọi xe 3 hãng, Điều phối mã nguồn | `client/src/pages/TripPage.jsx`<br>`client/src/components/itinerary/TripMap.jsx`<br>`client/src/components/itinerary/TimelineItem.jsx`<br>`client/src/components/itinerary/ItineraryPanel.jsx`<br>`client/src/components/companion/LiveCompanionView.jsx`<br>`client/src/components/companion/CheckinModal.jsx`<br>`client/src/lib/api.js` (Core API Gateway)<br>`client/server.py` | Quản trị Repo GitHub, Review PR, Đảm bảo giao diện 2 khung hình (Bản đồ + Timeline) và Chế độ Đi thực tế đồng bộ 100% trạng thái. |
| **2** | **Phạm Gia Hưng** | **Frontend Developer & UI/UX Specialist** | Sổ chi tiêu & Cước xe inline, Báo cáo Tổng kết & Story Card, Form 8 tiêu chí, My Trips, Settings, Đa ngôn ngữ | `client/src/components/companion/ExpenseTrackerView.jsx`<br>`client/src/components/companion/TripSummaryView.jsx`<br>`client/src/components/companion/TripRecapModal.jsx`<br>`client/src/components/TripForm.jsx`<br>`client/src/pages/LandingPage.jsx`<br>`client/src/pages/MyTripsPage.jsx`<br>`client/src/pages/SettingsPage.jsx`<br>`client/src/i18n/translations.js` | Đảm bảo tính toán ngân sách chuẩn xác, giao diện Story Card Canvas tải ảnh đẹp mắt, tối ưu Responsive Mobile 100% không vỡ khung. |
| **3** | **Đỗ Nguyễn An Khang** | **Backend Lead & Authentication Service** | Kiến trúc FastAPI, Xác thực JWT & Google OAuth, Bộ API Chuyến đi, Chia sẻ & Nhân bản | `server/main.py`<br>`server/app/api/v1/api.py`<br>`server/app/core/security.py`, `config.py`, `dependencies.py`<br>`server/app/schemas/user.py`, `trip.py`<br>`server/app/api/v1/endpoints/auth.py`<br>`server/app/api/v1/endpoints/trips.py`<br>`client/src/pages/SharedTripPage.jsx` | **Tự tích hợp API vào `AuthModal.jsx`, `AuthContext.jsx`, `TripPage.jsx`, `MyTripsPage.jsx` và tự test E2E luồng Auth + Chuyến đi.** |
| **4** | **Ngô Tấn Đạt** | **Database & Data Engineer** | CSDL PostgreSQL/Supabase, Cache địa điểm (TTL 7 ngày), Seed 30+ địa điểm TP.HCM, Google Places API | `server/app/db/schema.sql`<br>`server/app/db/session.py`<br>`server/app/db/hcmc_data.py`<br>`server/app/services/places_service.py`<br>`server/app/api/v1/endpoints/places.py`<br>`client/src/components/itinerary/PlaceDetailModal.jsx` | **Tự tích hợp dữ liệu địa điểm vào `TripMap.jsx` (Leaflet popup) và `PlaceDetailModal.jsx` (ảnh, giờ mở cửa, bài đánh giá), tự test E2E.** |
| **5** | **Lê Hữu Lam** | **AI Engine & Prompt Engineer** | SDK Google Gemini 2.5 Flash, Prompt Structured JSON, Sinh lịch trình tối ưu, AI Smart Swap 2-3 điểm | `server/app/schemas/ai.py`<br>`server/app/services/gemini_service.py`<br>`server/app/api/v1/endpoints/ai.py` | **Tự tích hợp API sinh lịch trình vào `TripForm.jsx` và API đổi địa điểm thông minh vào `TimelineItem.jsx` (Swap modal), tự test E2E.** |
| **6** | **Đàng Minh Hạo** | **Backend Developer — Routing & Adaptive** | Tính cự ly Haversine & cước 3 hãng xe Grab/XanhSM/Be, Kịch bản Trời mưa & Giờ cao điểm, Xuất lịch .ICS & Google Calendar | `server/app/utils/transit_calculator.py`<br>`server/app/services/contingency_service.py`<br>`server/app/services/calendar_service.py`<br>`server/app/schemas/calendar.py`<br>`server/app/api/v1/endpoints/calendar.py`<br>`client/src/components/common/RidePickerModal.jsx` | **Tự tích hợp cước xe vào `TransitConnector.jsx`, `RidePickerModal.jsx`, `ExpenseTrackerView.jsx`; tích hợp Kịch bản Mưa/Kẹt xe & Calendar vào FE.** |
| **7** | **Đoàn Hải Đăng** | **DevOps, QA Lead & Thuyết trình Dự án** | Docker hóa môi trường, CI/CD GitHub Actions, Bộ mã nguồn kiểm thử tự động Pytest, Báo cáo Word/PDF, Slide & Video Demo | `docker-compose.yml`<br>`client/Dockerfile`, `server/Dockerfile`<br>`.github/workflows/ci.yml`<br>`server/app/tests/conftest.py`<br>`server/app/tests/test_auth.py`, `test_trips.py`<br>`server/app/tests/test_places.py`, `test_ai.py`<br>`server/app/tests/test_transit.py`, `test_calendar.py`<br>`CHAY-DEMO.bat`, `run_all.bat` | Đảm bảo hệ thống build 1-click không lỗi; bộ test tự động pass 100%; hoàn thành Báo cáo kỹ thuật chuẩn Khoa CNTT, Slide Tiếng Anh & Video demo. |

---

## II. MA TRẬN PHÂN CÔNG MÃ NGUỒN CHI TIẾT (EXHAUSTIVE CODE MAPPING)

Dưới đây là bảng phân định trách nhiệm chi tiết đến **từng file mã nguồn** trong cây thư mục dự án:

### 1. Phân hệ Frontend (`client/`)
| Đường dẫn File mã nguồn | Mô tả chức năng | Thành viên phụ trách |
| :--- | :--- | :---: |
| `client/src/pages/TripPage.jsx` | Trang làm việc chính: Điều phối 4 Chế độ Tab, quản lý state đồng bộ giữa Bản đồ & Timeline | **Diệp Bảo Danh** |
| `client/src/components/itinerary/TripMap.jsx` | Bản đồ Leaflet tương tác: Marker số [1,2,3,4], Polyline nối chặng, đổi marker thành `✓` khi check-in | **Diệp Bảo Danh** |
| `client/src/components/itinerary/TimelineItem.jsx` | Thẻ lịch trình 3 tầng: Chống tràn/đè chữ với tên dài, nút Accept chốt điểm, nút Đổi điểm, khóa chặng đã hoàn thành | **Diệp Bảo Danh** |
| `client/src/components/itinerary/ItineraryPanel.jsx` | Thanh công cụ lịch trình: Điều hướng ngày (Day 1, 2, 3), đếm chặng chốt, dọn dẹp các nút trùng lặp | **Diệp Bảo Danh** |
| `client/src/components/companion/LiveCompanionView.jsx` | Tab 2 Chế độ Đi thực tế: Hero Card Next Stop, nút mở Google Maps, nút gọi xe 3 hãng, nút Hoàn thành chuyến đi | **Diệp Bảo Danh** |
| `client/src/components/companion/CheckinModal.jsx` | Modal check-in chặng: Tải ảnh chụp thực tế, nhập ghi chú cảm xúc, lưu trữ mốc thời gian ghé thăm | **Diệp Bảo Danh** |
| `client/src/lib/api.js` | Client API Adapter trung tâm: Khởi tạo Axios/Fetch client, cấu hình BaseURL, Interceptor đính kèm Token JWT | **Diệp Bảo Danh** |
| `client/server.py` | Máy chủ nội bộ phục vụ SPA Demo: Tự động mở Google Chrome tại `localhost:5173/trip/demo`, chặn cache | **Diệp Bảo Danh** |
| `client/src/components/companion/ExpenseTrackerView.jsx` | Tab 3 Sổ chi tiêu: Bảng kê chi phí hoạt động, ăn uống và cước xe; hỗ trợ sửa cước xe trực tiếp (*inline editing*) | **Phạm Gia Hưng** |
| `client/src/components/companion/TripSummaryView.jsx` | Tab 4 Giao diện Tổng kết chuyến đi: Báo cáo 4 chỉ số KPI chi tiêu, cơ cấu ngân sách 3 nhóm, album ảnh kỷ niệm | **Phạm Gia Hưng** |
| `client/src/components/companion/TripRecapModal.jsx` | Modal chúc mừng hoàn thành chuyến đi: Tóm tắt số điểm đã đến, tổng ngân sách đã chi, mở Story Card | **Phạm Gia Hưng** |
| `client/src/components/TripForm.jsx` | Form khảo sát 8 tiêu chí chuyên sâu: Thu thập nhu cầu du khách, kết nối AI Generator sinh lịch trình | **Phạm Gia Hưng** *(hợp tác Lam)* |
| `client/src/pages/LandingPage.jsx` | Trang chủ giới thiệu hệ thống: Hero Section, bộ sưu tập lịch trình mẫu Sài Gòn, trải nghiệm trực quan | **Phạm Gia Hưng** |
| `client/src/components/landing/*` | Các thành phần đồ họa: `Hero3D.jsx` (Canvas 3D), `PhotoMarquee.jsx`, `SpotlightCard.jsx`, `MagneticButton.jsx` | **Phạm Gia Hưng** |
| `client/src/pages/MyTripsPage.jsx` | Trang "Chuyến của tôi": Quản lý danh sách chuyến đi đã lưu, phân loại trạng thái, nút nhân bản (clone), xóa | **Phạm Gia Hưng** *(hợp tác Khang)* |
| `client/src/pages/SettingsPage.jsx` | Trang Cài đặt: Quản lý hồ sơ du lịch (Travel Profile AI), đổi mật khẩu, liên kết Google Calendar, Dark mode | **Phạm Gia Hưng** |
| `client/src/i18n/I18nContext.jsx` & `translations.js` | Hệ thống Đa ngôn ngữ Song ngữ Anh - Việt (VI/EN Toggle) chuẩn xác 100% nhãn giao diện | **Phạm Gia Hưng** |
| `client/src/pages/SharedTripPage.jsx` | Trang xem chuyến đi công khai qua link chia sẻ (Read-only view): Ẩn thông tin cá nhân của người tạo | **Đỗ Nguyễn An Khang** *(Tự tích hợp)* |
| `client/src/components/AuthModal.jsx` & `GoogleSignInButton.jsx` | Modal Đăng nhập/Đăng ký tài khoản và nút Đăng nhập Google One-Tap/OAuth 2.0 | **Đỗ Nguyễn An Khang** *(Tự tích hợp)* |
| `client/src/context/AuthContext.jsx` & `lib/auth.js` | Quản lý trạng thái phiên đăng nhập toàn cục trên Frontend, lưu trữ và tự làm mới JWT Token | **Đỗ Nguyễn An Khang** *(Tự tích hợp)* |
| `client/src/components/itinerary/PlaceDetailModal.jsx` | Modal xem chi tiết địa điểm: Hiển thị hình ảnh thực tế, giờ mở cửa, giá vé tham quan và bài đánh giá | **Ngô Tấn Đạt** *(Tự tích hợp)* |
| `client/src/components/itinerary/TransitConnector.jsx` | Khối di chuyển giữa 2 chặng: Hiển thị cự ly (km), thời gian di chuyển, phương tiện và nút mở Modal gọi xe | **Đàng Minh Hạo** *(Tự tích hợp)* |
| `client/src/components/common/RidePickerModal.jsx` | Modal chọn xe 3 hãng: Hiển thị cước ước tính song song của Grab, Xanh SM và Be kèm deep-link mở app di động | **Đàng Minh Hạo & Diệp Bảo Danh** |

---

### 2. Phân hệ Backend (`server/`)
| Đường dẫn File mã nguồn | Mô tả chức năng | Thành viên phụ trách |
| :--- | :--- | :---: |
| `server/main.py` | File điểm khởi chạy FastAPI: Thiết lập middleware CORS, xử lý ngoại lệ toàn cục, mount router API v1 | **Đỗ Nguyễn An Khang** |
| `server/app/api/v1/api.py` | Router tổng hợp của API v1: Kết nối tất cả router con (auth, trips, places, ai, calendar, transit) | **Đỗ Nguyễn An Khang** |
| `server/app/core/config.py` | Quản lý biến môi trường `.env` bằng Pydantic BaseSettings (SECRET_KEY, DATABASE_URL, GEMINI_API_KEY) | **Đỗ Nguyễn An Khang** |
| `server/app/core/security.py` | Thuật toán bảo mật: Băm mật khẩu bcrypt, hàm phát hành và kiểm tra tính hợp lệ của JWT Token Bearer | **Đỗ Nguyễn An Khang** |
| `server/app/core/dependencies.py` | FastAPI Dependencies: Hàm `get_db` cấp phát DB session, hàm `get_current_user` xác thực token người dùng | **Đỗ Nguyễn An Khang** |
| `server/app/schemas/user.py` & `trip.py` | Pydantic Schemas định nghĩa cấu trúc dữ liệu Request/Response cho Auth và Quản lý chuyến đi | **Đỗ Nguyễn An Khang** |
| `server/app/api/v1/endpoints/auth.py` | API Xác thực: `POST /register`, `POST /login`, `POST /google-auth`, `GET /me`, `PUT /profile` | **Đỗ Nguyễn An Khang** |
| `server/app/api/v1/endpoints/trips.py` | API Chuyến đi: CRUD `/trips`, `/trips/{id}/stops/{stop_id}`, `POST /trips/{id}/clone`, `POST /share` | **Đỗ Nguyễn An Khang** |
| `server/app/db/schema.sql` | DDL Thiết kế CSDL PostgreSQL: Bảng `users`, `trips`, `trip_days`, `itinerary_items`, `expenses`, `places_cache` | **Ngô Tấn Đạt** |
| `server/app/db/session.py` | Cấu hình SQLAlchemy Engine kết nối PostgreSQL/Supabase, quản lý Connection Pool và SessionLocal | **Ngô Tấn Đạt** |
| `server/app/db/hcmc_data.py` | Tập dữ liệu Seed 30+ địa điểm nổi tiếng bậc nhất TP.HCM: Tọa độ GPS, giá vé, giờ mở cửa, ảnh, mô tả văn hóa | **Ngô Tấn Đạt** |
| `server/app/services/places_service.py` | Dịch vụ địa điểm & Chiến lược Cache (TTL 7 ngày): Giảm 80% chi phí gọi Google Places API New bên thứ 3 | **Ngô Tấn Đạt** |
| `server/app/api/v1/endpoints/places.py` | API Địa điểm: `GET /places/search`, `GET /places/{id}`, `GET /places/popular`, `GET /categories` | **Ngô Tấn Đạt** |
| `server/app/schemas/ai.py` | Pydantic Schema ràng buộc cấu trúc Gemini Structured Output JSON (không bao giờ lỗi định dạng) | **Lê Hữu Lam** |
| `server/app/services/gemini_service.py` | Dịch vụ AI Gemini 2.5 Flash: Prompt chuyên gia bản địa Sài Gòn, Few-shot template, Rate Limiting & Retry | **Lê Hữu Lam** |
| `server/app/api/v1/endpoints/ai.py` | API AI: `POST /ai/generate` sinh lịch trình tối ưu đa ngày, `POST /ai/swap` gợi ý 2-3 địa điểm thay thế | **Lê Hữu Lam** |
| `server/app/utils/transit_calculator.py` | Thuật toán tính cự ly Haversine giữa 2 tọa độ GPS, thời gian và biểu giá cước xe 3 hãng Grab, Xanh SM, Be | **Đàng Minh Hạo** |
| `server/app/services/contingency_service.py` | Động cơ Kịch bản Thích ứng: Đổi điểm trong nhà khi Trời mưa Sài Gòn; cộng đệm thời gian Giờ cao điểm (17h-19h) | **Đàng Minh Hạo** |
| `server/app/services/calendar_service.py` | Dịch vụ Calendar: Sinh nội dung file iCalendar `.ics` chuẩn RFC 5545 và REST API đồng bộ Google Calendar | **Đàng Minh Hạo** |
| `server/app/schemas/calendar.py` | Pydantic Schema cho kịch bản xuất lịch và thông tin đồng bộ thời gian | **Đàng Minh Hạo** |
| `server/app/api/v1/endpoints/calendar.py` | API Lịch trình: `GET /calendar/ics/{trip_id}` tải file .ics, `POST /calendar/sync-google` đồng bộ tài khoản | **Đàng Minh Hạo** |

---

### 3. Phân hệ DevOps, Tự động hóa CI/CD & Bộ mã nguồn Kiểm thử (`tests/`, `docker/`)
| Đường dẫn File mã nguồn | Mô tả chức năng | Thành viên phụ trách |
| :--- | :--- | :---: |
| `docker-compose.yml` | File điều phối Docker Compose: Khởi chạy trọn vẹn Client + Server + PostgreSQL Database trong 1 lệnh | **Đoàn Hải Đăng** |
| `client/Dockerfile` | Dockerfile cho Frontend: Multi-stage build (Node.js build Vite -> Nginx / Python static server siêu nhẹ) | **Đoàn Hải Đăng** |
| `server/Dockerfile` | Dockerfile cho Backend: Môi trường Python 3.11+, cài đặt `requirements.txt` và chạy máy chủ Uvicorn | **Đoàn Hải Đăng** |
| `.github/workflows/ci.yml` | Pipeline GitHub Actions CI/CD: Tự động kích hoạt khi có Pull Request, kiểm tra lint, build frontend, chạy test suite | **Đoàn Hải Đăng** |
| `server/app/tests/conftest.py` | Cấu hình Pytest Fixtures: Thiết lập Test Database SQLite/PostgreSQL trong RAM, TestClient ảo HTTPX | **Đoàn Hải Đăng** |
| `server/app/tests/test_auth.py` | Kiểm thử tự động Xác thực: Đăng ký tài khoản, đăng nhập, mã hóa bcrypt, xác thực JWT Token đúng/sai | **Đoàn Hải Đăng** |
| `server/app/tests/test_trips.py` | Kiểm thử tự động Chuyến đi: Tạo chuyến đi mới, lưu DB, cập nhật check-in chặng, nhân bản và chia sẻ link | **Đoàn Hải Đăng** |
| `server/app/tests/test_places.py` | Kiểm thử tự động Dữ liệu Địa điểm: Truy vấn danh mục, tìm kiếm địa điểm, kiểm tra cơ chế Cache TTL 7 ngày | **Đoàn Hải Đăng** |
| `server/app/tests/test_ai.py` | Kiểm thử tự động AI Engine: Xác thực Schema JSON sinh ra từ Gemini, kiểm tra kịch bản AI Smart Swap | **Đoàn Hải Đăng** |
| `server/app/tests/test_transit.py` | Kiểm thử tự động Tính cước di chuyển: Kiểm tra công thức Haversine, độ lệch cước 3 hãng Grab, Xanh SM, Be | **Đoàn Hải Đăng** |
| `server/app/tests/test_calendar.py` | Kiểm thử tự động Calendar: Kiểm tra cú pháp file `.ICS` hợp lệ, kiểm tra sự kiện nhắc trước 30 phút | **Đoàn Hải Đăng** |
| `CHAY-DEMO.bat`, `run_all.bat` | Bộ script Windows 1-Click: Giải phóng cổng 5173/8000, khởi động toàn hệ thống và tự động mở Google Chrome | **Đoàn Hải Đăng & Diệp Bảo Danh** |

---

## III. BẢN MÔ TẢ CHI TIẾT NHIỆM VỤ, TRÁCH NHIỆM & TIÊU CHÍ HOÀN THÀNH (DoD)

### 1. DIỆP BẢO DANH — FRONTEND LEAD & SYSTEM ARCHITECT (TRƯỞNG NHÓM - MSSV: 25127029)
* **Vị trí cốt lõi:** Trưởng nhóm — Kiến trúc sư Hệ thống & Lead Frontend.
* **Các file code sở hữu chính:**
  * `client/src/pages/TripPage.jsx`
  * `client/src/components/itinerary/TripMap.jsx`
  * `client/src/components/itinerary/TimelineItem.jsx`
  * `client/src/components/itinerary/ItineraryPanel.jsx`
  * `client/src/components/companion/LiveCompanionView.jsx`
  * `client/src/components/companion/CheckinModal.jsx`
  * `client/src/lib/api.js` (Cấu trúc Gateway API trung tâm)
  * `client/server.py` & `CHAY-DEMO.bat`
* **Nhiệm vụ cụ thể:**
  1. *Quản trị Repository GitHub:* Thiết lập nhánh `main` (bảo vệ) và nhánh `dev`; phân chia nhánh tính năng (`feature/*`); xét duyệt Pull Request (Code Review); giải quyết xung đột mã nguồn (merge conflict).
  2. *Khung 1 (Bản đồ Leaflet tương tác):* Lập trình bản đồ tải nhanh bằng Leaflet/OpenStreetMap; vẽ marker số thứ tự [1, 2, 3, 4] phân biệt các chặng trong ngày; vẽ đường polyline nối tuyến; tự động cập nhật marker thành dấu tích xanh `✓` ngay khi chặng được check-in.
  3. *Khung 2 (Lịch trình Timeline 3 tầng chống đè chữ):* Xây dựng bố cục 3 tầng độc lập (Tầng 1: Giờ + Icon + Giá tiền góc phải; Tầng 2: Tên địa điểm 100% bề ngang không che chữ; Tầng 3: Nút Chốt điểm và Đổi điểm); đổi nền sang màu xanh ngọc nhẹ (`emerald-50`) và khóa toàn bộ thao tác chỉnh sửa đối với các điểm đã hoàn thành.
  4. *Tab 2 (Chế độ Đi thực tế thời gian thực):* Thẻ Hero hiển thị điểm đến tiếp theo; tích hợp định vị GPS chỉ đường Google Maps; nút bấm *"Hoàn thành chuyến đi"* chuyển trang mượt mà sang Tab 4 Tổng kết.
  5. *Checkin Modal:* Lập trình modal cho phép du khách check-in chặng, tải ảnh lưu niệm và ghi chú cảm nghĩ.
* **Tiêu chí hoàn thành (DoD):** Giao diện 2 khung hình hoạt động trơn tru; bản đồ và timeline đồng bộ tức thì; không có bất kỳ lỗi che khuất chữ nào trên giao diện.

---

### 2. PHẠM GIA HƯNG — FRONTEND DEVELOPER & UI/UX SPECIALIST
* **Vị trí cốt lõi:** Frontend Developer — Quản lý Chi tiêu, Báo cáo Tổng kết, Form khảo sát & Responsive Mobile.
* **Các file code sở hữu chính:**
  * `client/src/components/companion/ExpenseTrackerView.jsx`
  * `client/src/components/companion/TripSummaryView.jsx`
  * `client/src/components/companion/TripRecapModal.jsx`
  * `client/src/components/TripForm.jsx`
  * `client/src/pages/LandingPage.jsx` & `client/src/components/landing/*`
  * `client/src/pages/MyTripsPage.jsx`
  * `client/src/pages/SettingsPage.jsx`
  * `client/src/i18n/I18nContext.jsx` & `translations.js`
* **Nhiệm vụ cụ thể:**
  1. *Tab 3 (Sổ chi tiêu & Quản lý di chuyển):* Bảng kê chi tiết từng khoản chi hoạt động, ăn uống và cước xe di chuyển giữa các chặng; **tính năng sửa cước xe trực tiếp (*inline editing*)** giúp du khách điền số tiền xe thực tế; thanh tiến độ ngân sách trực quan.
  2. *Tab 4 (Giao diện Tổng kết chuyến đi - Trip Summary):* Thống kê 4 chỉ số KPI quan trọng (Tổng chi phí, Chênh lệch ngân sách, Số điểm đã ghé thăm, Tổng cự ly di chuyển); biểu đồ cơ cấu chi tiêu 3 nhóm; album ảnh check-in thực tế.
  3. *Xuất Thẻ kỷ niệm (Story Card Canvas):* Lập trình vẽ Canvas sinh ảnh đồ họa tổng kết chuyến đi (tỷ lệ 9:16 Story và 1:1 Vuông) cho phép tải ảnh về máy điện thoại chia sẻ Facebook/Instagram.
  4. *Form khảo sát 8 tiêu chí chuyên sâu:* Giao diện thu thập nhu cầu (Số ngày, Quận ưu tiên, Ngân sách, Sở thích, Người đi cùng, Phương tiện, Nhịp độ, Ghi chú) kết nối trực tiếp AI Generator.
  5. *Trang "Chuyến của tôi" & Trang "Cài đặt":* Xây dựng giao diện xem lại lịch sử chuyến đi, nút nhân bản (clone), bộ lọc trạng thái; giao diện xem Hồ sơ du lịch AI (Travel Profile) và bật tắt Chế độ Sáng/Tối.
  6. *Hệ thống Đa ngôn ngữ (VI/EN) & Responsive Mobile:* Quản lý bộ từ điển Anh - Việt trong `translations.js`; tinh chỉnh Tailwind CSS đảm bảo 100% màn hình hiển thị hoàn hảo trên Smartphone.
* **Tiêu chí hoàn thành (DoD):** Sổ chi tiêu tính toán tiền chính xác tuyệt đối; xuất ảnh Story Card sắc nét; giao diện responsive mượt mà trên iPhone/Android ngoài trời.

---

### 3. ĐỖ NGUYỄN AN KHANG — BACKEND LEAD & AUTHENTICATION SERVICE
* **Vị trí cốt lõi:** Backend Lead — Kiến trúc FastAPI, Xác thực Người dùng & Quản trị Chuyến đi.
* **Các file code sở hữu chính:**
  * `server/main.py`
  * `server/app/api/v1/api.py`
  * `server/app/core/config.py`, `security.py`, `dependencies.py`
  * `server/app/schemas/user.py`, `trip.py`
  * `server/app/api/v1/endpoints/auth.py`
  * `server/app/api/v1/endpoints/trips.py`
  * `client/src/pages/SharedTripPage.jsx` *(Tự tích hợp)*
* **Nhiệm vụ cụ thể:**
  1. *Khung dự án FastAPI:* Dựng cấu trúc mã nguồn Backend chuẩn RESTful; cấu hình CORS cho phép kết nối an toàn từ Frontend; thiết lập bắt lỗi ngoại lệ tập trung (Global Exception Handler).
  2. *Dịch vụ Xác thực An toàn (Auth Service):*
     * Mã hóa mật khẩu bằng thuật toán chuẩn công nghiệp `bcrypt`.
     * Cấp phát và xác thực JWT Bearer Token theo RFC 7519 trong Dependency `get_current_user`.
     * Tích hợp Google OAuth 2.0 (Google Sign-In) xác thực id_token từ Google API.
  3. *Bộ API Quản lý Chuyến đi (Trip API):*
     * `POST /api/v1/trips`: Lưu chuyến đi vào CSDL.
     * `GET /api/v1/trips/{id}`: Lấy chi tiết lịch trình chuyến đi.
     * `PATCH /api/v1/trips/{id}/stops/{stopId}`: Cập nhật trạng thái check-in, ảnh và ghi chú.
     * `GET /api/v1/trips/me`: Lấy danh sách chuyến đi của người dùng đang đăng nhập.
     * `POST /api/v1/trips/{id}/clone`: Sao chép nhân bản chuyến đi.
     * `POST /api/v1/trips/{id}/share` & `GET /api/v1/trips/shared/{token}`: Tạo token chia sẻ và xem chuyến đi công khai ẩn thông tin nhạy cảm.
  4. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Kết nối API đăng nhập/đăng ký vào `AuthModal.jsx` và `AuthContext.jsx`.
     * Kết nối danh sách chuyến đi vào `MyTripsPage.jsx`.
     * Kết nối trang chia sẻ công khai vào `SharedTripPage.jsx`.
     * Tự test luồng đăng nhập, lưu chuyến đi và chia sẻ link công khai cho tới khi chạy thông suốt.
* **Tiêu chí hoàn thành (DoD):** Xác thực an toàn 100%; bảo vệ route chặt chẽ; CRUD chuyến đi phản hồi dưới 100ms; luồng E2E trên Web hoạt động hoàn hảo.

---

### 4. NGÔ TẤN ĐẠT — DATABASE & DATA ENGINEER
* **Vị trí cốt lõi:** Data Engineer — Thiết kế CSDL PostgreSQL, Chiến lược Cache & Dữ liệu Địa điểm TP.HCM.
* **Các file code sở hữu chính:**
  * `server/app/db/schema.sql`
  * `server/app/db/session.py`
  * `server/app/db/hcmc_data.py`
  * `server/app/services/places_service.py`
  * `server/app/api/v1/endpoints/places.py`
  * `client/src/components/itinerary/PlaceDetailModal.jsx` *(Tự tích hợp)*
* **Nhiệm vụ cụ thể:**
  1. *Lược đồ CSDL Quan hệ (PostgreSQL Schema):* Thiết kế các bảng `users`, `trips`, `trip_days`, `itinerary_items`, `expenses`, `places_cache` với ràng buộc toàn vẹn khóa ngoại (Foreign Keys) và Indexes tăng tốc truy vấn.
  2. *Bộ đệm Địa điểm (Places Cache TTL 7 ngày):* Xây dựng cơ chế cache địa điểm trong bảng `places_cache`; tự động hoàn trả dữ liệu từ CSDL cục bộ; chỉ gọi Google Places API New khi cache miss hoặc dữ liệu quá hạn 7 ngày.
  3. *Tập dữ liệu Mồi TP.HCM (`hcmc_data.py`):* Thu thập, làm sạch và chuẩn hóa hơn 30+ địa danh nổi tiếng Sài Gòn (Dinh Độc Lập, Bưu điện TP, Chợ Bến Thành, Landmark 81, Bến Bạch Đằng, Bảo tàng Chứng tích Chiến tranh, Phở Hòa Pasteur, Cơm tấm Ba Ghiền,... đầy đủ tọa độ GPS, mức giá, thời lượng tham quan, ảnh chất lượng cao).
  4. *Bộ API Địa điểm:* `GET /api/v1/places/search`, `GET /api/v1/places/{id}`, `GET /api/v1/places/popular`.
  5. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Đảm bảo dữ liệu từ DB hiển thị đầy đủ trên Bản đồ Leaflet (`TripMap.jsx`).
     * Tự kết nối API chi tiết địa điểm vào `PlaceDetailModal.jsx` (ảnh, mô tả, giờ mở cửa).
     * Tự test truy vấn dữ liệu địa điểm hiển thị chính xác trên giao diện Frontend.
* **Tiêu chí hoàn thành (DoD):** CSDL triển khai hoàn tất trên PostgreSQL/Supabase; script seed nạp dữ liệu chạy 100% thành công; query địa điểm phản hồi dưới 30ms.

---

### 5. LÊ HỮU LAM — AI ENGINE & PROMPT ENGINEER
* **Vị trí cốt lõi:** AI Engineer — Tích hợp Google Gemini, Kỹ thuật Prompt & Tối ưu Lịch trình.
* **Các file code sở hữu chính:**
  * `server/app/schemas/ai.py`
  * `server/app/services/gemini_service.py`
  * `server/app/api/v1/endpoints/ai.py`
* **Nhiệm vụ cụ thể:**
  1. *Tích hợp Google Gemini API:* Cấu hình SDK Gemini (`gemini-2.5-flash`), quản lý API Key an toàn, xử lý Rate Limiting, Exponential Backoff Retry và kịch bản Fallback khi mất kết nối.
  2. *Kỹ thuật Prompt Chuyên gia Bản địa:*
     * Soạn thảo System Instruction định vị AI là *"Chuyên gia Du lịch Bản địa TP.HCM am hiểu sâu sắc văn hóa, ẩm thực từng con hẻm Sài Gòn"*.
     * Kỹ thuật Few-shot Prompting với các kịch bản lịch trình mẫu cân đối theo múi giờ sinh hoạt của người Sài Gòn.
  3. *Gemini Structured Outputs (Ràng buộc Schema JSON):* Ràng buộc chặt chẽ JSON Schema đầu ra, đảm bảo 100% phản hồi từ Gemini trả về JSON chuẩn xác theo cấu trúc Frontend cần, không bị lỗi text tự do.
  4. *Động cơ Sinh Lịch trình Tối ưu:* Tiếp nhận 8 tiêu chí khảo sát -> Lựa chọn địa điểm theo cụm quận nhằm giảm thiểu thời gian di chuyển -> Phân bổ ngân sách hợp lý theo ngày.
  5. *Logic AI Đổi địa điểm thông minh (Smart Swap):* API `POST /api/v1/ai/swap` phân tích lý do đổi điểm của người dùng và đề xuất 2-3 địa điểm thay thế tương đương cùng khu vực và chi phí.
  6. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Tự kết nối API sinh lịch trình vào `TripForm.jsx`.
     * Tự kết nối API Smart Swap vào `TimelineItem.jsx` (modal đổi địa điểm).
     * Tự kiểm thử luồng sinh lịch trình và đổi điểm trực tiếp trên giao diện cho đến khi dữ liệu trả về mượt mà.
* **Tiêu chí hoàn thành (DoD):** Gemini trả về 100% chuẩn JSON; thời gian phản hồi AI trung bình dưới 3-5 giây; lịch trình gợi ý logic, hợp lý về địa lý TP.HCM.

---

### 6. ĐÀNG MINH HẠO — BACKEND DEVELOPER (ROUTING, TRANSIT & ADAPTIVE)
* **Vị trí cốt lõi:** Backend Developer — Thuật toán Di chuyển, Ước tính Cước xe & Động cơ Thích ứng.
* **Các file code sở hữu chính:**
  * `server/app/utils/transit_calculator.py`
  * `server/app/services/contingency_service.py`
  * `server/app/services/calendar_service.py`
  * `server/app/schemas/calendar.py`
  * `server/app/api/v1/endpoints/calendar.py`
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
  4. *Đồng bộ Lịch trình (Calendar Integration):*
     * Xuất file iCalendar `.ICS` chuẩn RFC 5545 cho phép nhập vào Google Calendar, Apple Calendar, Outlook kèm thông báo nhắc trước 30 phút.
     * Kết nối Google Calendar REST API đồng bộ sự kiện vào lịch cá nhân của người dùng.
  5. *YÊU CẦU TỰ TÍCH HỢP & TEST E2E:*
     * Kết nối cước xe vào `TransitConnector.jsx` và `RidePickerModal.jsx`.
     * Tự động đẩy chi phí di chuyển các chặng vào `ExpenseTrackerView.jsx`.
     * Tự test các nút Kịch bản Thích ứng và Đồng bộ Calendar trên giao diện Web.
* **Tiêu chí hoàn thành (DoD):** Khoảng cách tính toán có sai số dưới 5%; cước ước tính sát thực tế; chuyển đổi kịch bản thích ứng linh hoạt; file `.ICS` nhập vào điện thoại hiển thị chuẩn xác.

---

### 7. ĐOÀN HẢI ĐĂNG — DEVOPS, QA LEAD & THUYẾT TRÌNH DỰ ÁN
* **Vị trí cốt lõi:** DevOps Engineer & QA Lead — Hạ tầng Cloud, CI/CD, Bộ Mã nguồn Kiểm thử Tự động, Báo cáo & Thuyết trình.
* **Các file code sở hữu chính:**
  * `docker-compose.yml`
  * `client/Dockerfile` & `server/Dockerfile`
  * `.github/workflows/ci.yml` (Pipeline CI/CD tự động)
  * `server/app/tests/conftest.py`
  * `server/app/tests/test_auth.py`
  * `server/app/tests/test_trips.py`
  * `server/app/tests/test_places.py`
  * `server/app/tests/test_ai.py`
  * `server/app/tests/test_transit.py`
  * `server/app/tests/test_calendar.py`
  * `CHAY-DEMO.bat`, `run_all.bat`, `run_frontend.bat`, `run_backend.bat`
* **Nhiệm vụ cụ thể:**
  1. *Hạ tầng Docker Hóa & Triển khai Cloud (DevOps):*
     * Viết `client/Dockerfile` (multi-stage build) và `server/Dockerfile` (Python Uvicorn).
     * Viết `docker-compose.yml` cho phép chạy trọn gói cả hệ sinh thái (Frontend + Backend + PostgreSQL) với đúng 1 câu lệnh `docker compose up`.
     * Triển khai hệ thống lên Cloud: Frontend (Vercel), Backend (Render), Database (Supabase) đảm bảo link web công khai hoạt động 24/7.
  2. *Đường ống CI/CD Tự động hóa (`.github/workflows/ci.yml`):*
     * Thiết lập GitHub Actions tự động kích hoạt khi có Pull Request: Kiểm tra format code, build bundle Frontend và chạy bộ kiểm thử Backend.
  3. *Xây dựng Bộ Mã nguồn Kiểm thử Tự động (Pytest Test Suite):*
     * Viết trọn bộ test cases bao phủ toàn bộ các mô-đun nghiệp vụ: `test_auth.py`, `test_trips.py`, `test_places.py`, `test_ai.py`, `test_transit.py`, `test_calendar.py`.
     * Đảm bảo test suite chạy vượt qua 100% với báo cáo độ bao phủ mã nguồn (Coverage Report).
  4. *Hoàn thiện Báo cáo Kỹ thuật & Tài liệu Đồ án:*
     * Soạn thảo và chuẩn hóa Báo cáo Kỹ thuật Đồ án (Word/PDF) theo quy chuẩn hình thức của Khoa CNTT - ĐHKHTN.
  5. *Thiết kế Slide Thuyết trình & Video Demo:*
     * Biên tập bộ Slide thuyết trình chuyên nghiệp bằng Tiếng Anh (hoặc Song ngữ).
     * Soạn kịch bản thuyết trình và phân bổ câu hỏi phản biện (Q&A) với Giảng viên.
     * Quay và dựng Video Demo Full HD (3-5 phút) thuyết minh rõ ràng các tính năng độc đáo của đồ án.
* **Tiêu chí hoàn thành (DoD):** Docker compose chạy mượt mà; CI/CD pipeline xanh 100%; bộ test cases Pytest pass toàn bộ; Báo cáo, Slide và Video demo đạt chuẩn xuất sắc.

---

## IV. QUY TRÌNH PHỐI HỢP NHÓM & QUY CHUẨN GIT

Nhóm áp dụng quy chuẩn phân nhánh chặt chẽ:
1. **Repository chính thức:** `https://github.com/25127029-DBDANH/website-ai-travel`
2. **Quy tắc phân nhánh (Git Branching Strategy):**
   * `main`: Nhánh sản phẩm chính thức, ổn định 100%, có bảo vệ (Protected Branch).
   * `dev`: Nhánh tích hợp mã nguồn chung của toàn bộ 7 thành viên.
   * Các nhánh tính năng cá nhân:
     * `feature/fe-companion-v2-full` (Danh & Hưng)
     * `feature/be-auth-trip` (Khang)
     * `feature/db-schema-seed` (Đạt)
     * `feature/ai-gemini-flow` (Lam)
     * `feature/be-transit-adaptive` (Hạo)
     * `feature/devops-docker-ci` (Đăng)
3. **Quy trình duyệt mã nguồn (Code Review):** Mọi nhánh khi hoàn thành đều phải tạo Pull Request (PR) vào nhánh `dev` và phải được Trưởng nhóm (Danh) review và phê duyệt trước khi merge.
