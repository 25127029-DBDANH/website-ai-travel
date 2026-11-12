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

## 👥 BẢNG PHÂN CÔNG NHIỆM VỤ CHI TIẾT 7 THÀNH VIÊN

> [!IMPORTANT]
> **Quy định phân công cốt lõi của nhóm:**
> 1. **Diệp Bảo Danh (Trưởng nhóm)** và **Phạm Gia Hưng** **cố định phụ trách toàn diện mảng Front-end**.
> 2. Các thành viên phụ trách mảng Backend/AI/Data (**Khang, Đạt, Lam, Hạo**) chịu trách nhiệm **tự tích hợp trực tiếp API vào Frontend và tự kiểm thử (E2E Testing)** cho đến khi tính năng vận hành trơn tru trên giao diện người dùng.

---

### 1. DIỆP BẢO DANH — FRONTEND LEAD & SYSTEM ARCHITECT (TRƯỞNG NHÓM)
* **Họ và tên:** **Diệp Bảo Danh**
* **Mã số sinh viên (MSSV):** `25127029`
* **Vai trò chuyên môn:** Trưởng nhóm — Kiến trúc sư Hệ thống & Lead Frontend
* **Thư mục & File sở hữu chính:**
  * `client/src/pages/TripPage.jsx` (Điều phối 4 chế độ tab, state đồng bộ giữa bản đồ & timeline)
  * `client/src/components/itinerary/TripMap.jsx` (Khung 1 Bản đồ Leaflet tương tác, vẽ marker số [1,2,3,4] và đổi pin sang dấu tích xanh `✓`)
  * `client/src/components/itinerary/TimelineItem.jsx` (Khung 2 Thẻ lịch trình 3 tầng chống tràn/đè chữ, chốt Accept, Swap)
  * `client/src/components/itinerary/ItineraryPanel.jsx` (Thanh điều khiển lịch trình tối ưu, dọn nút trùng lặp)
  * `client/src/components/companion/LiveCompanionView.jsx` (Tab 2 Chế độ Đi thực tế thời gian thực, thẻ Hero, check-in)
  * `client/src/components/common/RidePickerModal.jsx` (Modal gọi xe tích hợp 3 hãng Grab, Xanh SM, Be)
* **Nhiệm vụ cụ thể:**
  1. *Quản trị Repository GitHub:* Phân chia nhánh tính năng (`feature/*`), review Pull Request, giải quyết xung đột mã nguồn (merge conflict).
  2. *Thiết kế Khung 1 (Bản đồ Leaflet):* Vẽ tuyến đường polyline nối các chặng, pan/zoom tự động theo tọa độ GPS, đổi marker thành icon `✓` khi chặng được check-in.
  3. *Tái cấu trúc Khung 2 (Timeline 3 tầng):* Giải quyết dứt điểm lỗi đè chữ khi địa điểm tên dài (*như Công viên Bến Bạch Đằng & Bến Tàu Thủy*). Khóa nút đổi điểm trên các chặng đã hoàn thành.
  4. *Xây dựng Chế độ Đi thực tế (Companion):* Thẻ Hero chỉ đường chặng kế tiếp, nút mở Google Maps, nút kích hoạt gọi xe 3 hãng, nút *"Hoàn thành chuyến đi"*.
* **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Giao diện 2 khung hình vận hành mượt mà, không vỡ layout trên desktop/laptop.
  - [x] Trạng thái check-in đồng bộ tức thì: Timeline đổi màu xanh dịu, Bản đồ đổi sang pin `✓`.
  - [x] Modal gọi xe hiển thị chính xác cước 3 hãng và kích hoạt deep-link mở ứng dụng tương ứng.

---

### 2. PHẠM GIA HƯNG — FRONTEND DEVELOPER & UI/UX SPECIALIST
* **Họ và tên:** **Phạm Gia Hưng**
* **Mã số sinh viên (MSSV):** `....................................................`
* **Vai trò chuyên môn:** Frontend Developer & Chuyên viên Thiết kế Giao diện Trải nghiệm (UI/UX)
* **Thư mục & File sở hữu chính:**
  * `client/src/components/companion/ExpenseTrackerView.jsx` (Tab 3 Sổ chi tiêu & Di chuyển, chỉnh sửa cước xe inline)
  * `client/src/components/companion/TripSummaryView.jsx` (Tab 4 Giao diện Tổng kết chuyến đi, 4 KPIs, album ảnh check-in)
  * `client/src/components/companion/StoryCardModal.jsx` & `client/src/lib/story-card.js` (Xuất Thẻ ảnh kỷ niệm Canvas 9:16)
  * `client/src/components/TripForm.jsx` (Bảng khảo sát yêu cầu du lịch 8 tiêu chí đặc thù TP.HCM)
  * `client/src/components/chat/ChatPanel.jsx` (Khung chat đàm thoại 4 bước với AI)
  * `client/src/styles.css` (Tối ưu Responsive chuẩn Mobile First cho smartphone)
* **Nhiệm vụ cụ thể:**
  1. *Xây dựng Tab 3 Sổ chi tiêu:* Tích hợp bảng thống kê các khoản vé, ăn uống và **từng chặng xe di chuyển**; phát triển tính năng bấm sửa cước xe trực tiếp (*Inline fare editing*) cho phép khách lưu số tiền thực chi.
  2. *Xây dựng Tab 4 Tổng kết chuyến đi:* Thống kê 4 thẻ chỉ số KPI, phân bổ cơ cấu 3 nhóm tiền, dòng thời gian lịch sử các ngày kèm hình ảnh chụp thực tế.
  3. *Lập trình Xuất Thẻ kỷ niệm (Story Card Canvas):* Sinh file ảnh đồ họa kích thước chuẩn Story (1080x1920) hoặc Vuông (1080x1080) sẵn sàng tải về máy đăng mạng xã hội.
  4. *Tối ưu Responsive Mobile First:* Tinh chỉnh CSS đảm bảo giao diện hiển thị xuất sắc, không tràn ngang khi du khách cầm điện thoại di chuyển ngoài đường.
* **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Sổ chi tiêu cập nhật ngân sách thời gian thực; tính năng inline fare editing lưu dữ liệu chuẩn xác.
  - [x] Màn hình tổng kết hiển thị đầy đủ hình ảnh, số liệu và câu chuyện chuyến đi.
  - [x] Xuất thẻ ảnh Story Card canvas sắc nét, tải về định dạng PNG trong 1 click.
  - [x] Website đạt chuẩn responsive 100% trên cả iPhone và Android.

---

### 3. ĐỖ NGUYỄN AN KHANG — BACKEND LEAD & AUTHENTICATION SERVICE
* **Họ và tên:** **Đỗ Nguyễn An Khang**
* **Mã số sinh viên (MSSV):** `....................................................`
* **Vai trò chuyên môn:** Backend Lead — Xác thực, Bảo mật & Dịch vụ Chuyến đi
* **Thư mục & File sở hữu chính:**
  * `server/main.py` & `server/app/api/v1/api.py` (Cấu hình FastAPI, CORS Middleware, Router tổng)
  * `server/app/core/security.py` & `dependencies.py` (Mã hóa bcrypt, ký/giải mã JWT Token, phân quyền)
  * `server/app/api/v1/endpoints/auth.py` (API đăng ký, đăng nhập email/mật khẩu, Google OAuth 2.0)
  * `server/app/api/v1/endpoints/trips.py` (API CRUD chuyến đi, cập nhật chặng `visited`, My Trips, chia sẻ liên kết)
  * `server/app/schemas/user.py` & `trip.py` (Pydantic validation schemas)
* **Nhiệm vụ cụ thể & Yêu cầu Tự tích hợp Frontend:**
  1. *Hệ thống Xác thực (Auth Service):* Xây dựng luồng đăng ký, đăng nhập bảo mật; cấp phát JWT Access Token (hạn 24h); tích hợp Google Sign-In (OAuth 2.0).
  2. *API Quản lý Chuyến đi:* Xây dựng các endpoint lưu chuyến mới (`POST /api/v1/trips`), lấy chi tiết (`GET /api/v1/trips/{id}`), cập nhật trạng thái chặng (`PATCH /api/v1/trips/{id}/stops/{stopId}`), danh sách My Trips (`GET /api/v1/trips/me`), tạo link chia sẻ (`POST /api/v1/trips/{id}/share`).
  3. **YÊU CẦU TỰ TÍCH HỢP & TEST:** **Khang chịu trách nhiệm kết nối trực tiếp các endpoint trên với Frontend (`client/src/components/AuthModal.jsx`, `TripPage.jsx`, `ShareDialog.jsx`), tự kiểm thử trên trình duyệt cho tới khi luồng đăng nhập, lưu chuyến đi và chia sẻ hoạt động ổn định 100%.**
* **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Bắt buộc đăng nhập để sử dụng tính năng tạo chuyến (trả về 401 Unauthorized nếu thiếu JWT token).
  - [x] Đăng nhập Google 1-chạm hoạt động trơn tru.
  - [x] CRUD chuyến đi phản hồi nhanh < 100ms, dữ liệu lưu đồng bộ giữa FE và BE.

---

### 4. NGÔ TẤN ĐẠT — DATABASE & DATA ENGINEER
* **Họ và tên:** **Ngô Tấn Đạt**
* **Mã số sinh viên (MSSV):** `....................................................`
* **Vai trò chuyên môn:** Kỹ sư Dữ liệu & Quản trị Cơ sở Dữ liệu (Database Administrator)
* **Thư mục & File sở hữu chính:**
  * `server/app/db/schema.sql` (Lược đồ CSDL PostgreSQL: `users`, `trips`, `itinerary_items`, `expenses`, `places_cache`)
  * `server/app/db/session.py` (Cấu hình SQLAlchemy Session & Connection Pooling)
  * `server/app/db/hcmc_data.py` (Bộ dữ liệu mồi Seed Data 30+ địa danh du lịch, lịch sử, ẩm thực TP.HCM)
  * `server/app/services/places_service.py` (Bộ đệm Cache địa điểm thông minh với TTL 7 ngày)
  * `server/app/api/v1/endpoints/places.py` (API tìm kiếm địa điểm, tích hợp Google Places API New)
* **Nhiệm vụ cụ thể & Yêu cầu Tự tích hợp Frontend:**
  1. *Thiết kế CSDL Quan hệ chuẩn hóa:* Thiết kế đầy đủ bảng, khóa chính UUID, khóa ngoại có ràng buộc `ON DELETE CASCADE`, tạo index tìm kiếm theo tọa độ và quận.
  2. *Chuẩn bị Dữ liệu Thực tế TP.HCM:* Thu thập và nạp sẵn 30+ địa điểm đặc sắc nhất TP.HCM (tọa độ GPS WGS84 chính xác, giá vé thực tế, khung giờ mở cửa, mô tả và hình ảnh đẹp mắt).
  3. *Hệ thống Bộ đệm Cache (places_cache):* Giúp hệ thống không cần gọi lại Google Places API nếu địa điểm đã có trong cache (giảm 80% chi phí API và tăng tốc truy vấn).
  4. **YÊU CẦU TỰ TÍCH HỢP & TEST:** **Đạt chịu trách nhiệm đảm bảo dữ liệu địa điểm từ CSDL nạp lên hiển thị đầy đủ trên Bản đồ Leaflet (`TripMap.jsx`) và Thẻ Lịch trình (`TimelineItem.jsx`) của Frontend.**
* **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] CSDL triển khai thành công trên PostgreSQL/Supabase; script seed nạp dữ liệu chạy thành công trong 1 lệnh.
  - [x] Tốc độ truy vấn dữ liệu địa điểm trong cache < 30ms.
  - [x] Tọa độ của toàn bộ địa điểm khớp 100% với thực tế đường sá TP.HCM.

---

### 5. LÊ HỮU LAM — AI ENGINE & PROMPT SPECIALIST (GEMINI INTEGRATION)
* **Họ và tên:** **Lê Hữu Lam**
* **Mã số sinh viên (MSSV):** `....................................................`
* **Vai trò chuyên môn:** Kỹ sư Trí tuệ Nhân tạo & Kỹ nghệ Prompt (AI / LLM Engineer)
* **Thư mục & File sở hữu chính:**
  * `server/app/services/gemini_service.py` (SDK Google Gemini 2.5 Flash API, System Instructions TP.HCM)
  * `server/app/schemas/ai.py` (Pydantic Schema ràng buộc định dạng Structured JSON đầu ra)
  * `server/app/api/v1/endpoints/ai.py` (Endpoint đàm thoại 4 bước, sinh lịch trình & Smart Swap)
  * `docs/04-prompt-ai-flow.md` (Tài liệu kỹ nghệ prompt và ví dụ few-shot)
* **Nhiệm vụ cụ thể & Yêu cầu Tự tích hợp Frontend:**
  1. *Tích hợp Google Gemini 2.5 Flash:* Xây dựng dịch vụ gọi Gemini an toàn, bảo vệ API Key, xử lý Rate Limit và cơ chế Retry khi mạng chập chờn.
  2. *Kỹ thuật Prompt Engineering chuyên sâu:* Định hình AI đóng vai trò *"Chuyên gia Du lịch Bản địa am hiểu sâu sắc Sài Gòn"*, gợi ý lịch trình có gu, phù hợp văn hóa TP.HCM.
  3. *Ràng buộc Structured JSON Output:* Ép AI sinh kết quả lịch trình tuân thủ 100% JSON Schema, không bao giờ sinh thừa ký tự markdown hay làm vỡ dữ liệu.
  4. *Luồng đàm thoại 4 bước:* Submit form -> Gợi ý concept -> Người dùng duyệt -> Sinh lịch trình chi tiết.
  5. *Logic Đổi địa điểm thông minh (Smart Swap):* Gợi ý 3-4 điểm thay thế cùng quận và phân khúc giá.
  6. **YÊU CẦU TỰ TÍCH HỢP & TEST:** **Lam chịu trách nhiệm kết nối trực tiếp API Gemini với Khung Chat (`ChatPanel.jsx`) và Modal Đổi điểm (`SwapModal.jsx`), tự test phản hồi AI trên giao diện tới khi không còn lỗi format.**
* **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] AI sinh lịch trình 100% hợp lệ JSON Schema, không bao giờ bị crash giao diện.
  - [x] Thời gian phản hồi AI trung bình < 3-5 giây.
  - [x] Đàm thoại tự nhiên, câu chữ tiếng Việt chuẩn xác mang phong vị TP.HCM.

---

### 6. ĐÀNG MINH HẠO — BACKEND DEVELOPER (ROUTING, TRANSIT & ADAPTIVE LOGIC)
* **Họ và tên:** **Đàng Minh Hạo**
* **Mã số sinh viên (MSSV):** `....................................................`
* **Vai trò chuyên môn:** Backend Developer — Thuật toán Tuyến đường, Cước xe & Động cơ Thích ứng
* **Thư mục & File sở hữu chính:**
  * `server/app/utils/transit_calculator.py` (Thuật toán Haversine tính khoảng cách & ước tính cước Grab/XanhSM/Be)
  * `server/app/services/contingency_service.py` (Động cơ thích ứng: Kịch bản Trời mưa Sài Gòn & Giờ cao điểm TP.HCM)
  * `server/app/services/calendar_service.py` & `endpoints/calendar.py` (API xuất file lịch quốc tế `.ICS` và đồng bộ Google Calendar)
  * `server/app/schemas/calendar.py` (Schema dữ liệu lịch và kịch bản)
* **Nhiệm vụ cụ thể & Yêu cầu Tự tích hợp Frontend:**
  1. *Tính toán Cước xe Di chuyển (Transit Fare Calculator):* Xây dựng công thức ước tính cước theo cự ly thực tế cho 3 hãng xe công nghệ phổ biến nhất Sài Gòn: **Grab (Bike/Car)**, **Xanh SM (Bike/Taxi điện)**, **Be (Bike/Car)**.
  2. *Kịch bản Thích ứng Thông minh:*
     * *Trời mưa Sài Gòn:* Tự động lọc chuyển các điểm ngoài trời sang điểm trong nhà có mái che, đổi phương tiện sang xe có mái che.
     * *Giờ cao điểm TP.HCM (17h - 19h):* Tự động cộng thêm +20 phút đệm kẹt xe, ưu tiên các điểm lân cận trong cùng một quận.
  3. *Xuất lịch trình chuẩn quốc tế .ICS:* Tạo file iCalendar tương thích Google Calendar, Apple Calendar, có nhắc hẹn trước 30 phút.
  4. **YÊU CẦU TỰ TÍCH HỢP & TEST:** **Hạo chịu trách nhiệm kết nối trực tiếp bảng giá cước xe vào Modal Gọi xe (`RidePickerModal.jsx`) và Sổ chi tiêu (`ExpenseTrackerView.jsx`); tự test các nút kịch bản thời tiết trên Frontend (`TripPage.jsx`).**
* **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Tính khoảng cách địa lý sai số < 5% so với Google Maps.
  - [x] Cước ước tính 3 hãng xe sát thực tế đường sá TP.HCM.
  - [x] Bật nút Trời mưa / Giờ cao điểm hệ thống tự thích ứng lịch trình tức thì.
  - [x] File `.ICS` tải về mở được ngay trên điện thoại iPhone / Android.

---

### 7. ĐOÀN HẢI ĐĂNG — DEVOPS, QA LEAD & THUYẾT TRÌNH DỰ ÁN
* **Họ và tên:** **Đoàn Hải Đăng**
* **Mã số sinh viên (MSSV):** `....................................................`
* **Vai trò chuyên môn:** Kỹ sư Vận hành Hạ tầng (DevOps), Lead Kiểm thử Chất lượng (QA) & Thuyết trình
* **Thư mục & File sở hữu chính:**
  * `docker-compose.yml`, `Dockerfile` (Đóng gói container chuẩn hóa môi trường toàn nhóm)
  * `CHAY-DEMO.bat`, `run_all.bat`, `run_frontend.bat`, `run_backend.bat` (Bộ script khởi chạy 1-click tiện lợi)
  * `server/tests/` (Bộ kịch bản kiểm thử tự động toàn diện bằng `pytest` và `httpx`)
  * `docs/08-testing.md`, `docs/09-deploy.md`, `docs/13-demo-qa.md`, `docs/14-checklist.md` (Tài liệu kiểm thử & báo cáo)
* **Nhiệm vụ cụ thể:**
  1. *Đóng gói & Triển khai Cloud:* Viết Dockerfile tối ưu; cấu hình CI/CD tự động build; triển khai web lên Vercel (Frontend), Render (Backend), Supabase (Database).
  2. *Bộ Kiểm thử Tự động (Automated Testing Suite):* Viết test cases bao phủ các chức năng cốt lõi (Auth, Trips, Gemini Mock, Haversine, Rate Limiting), kiểm thử các trường hợp mất mạng hoặc dữ liệu biên.
  3. *Báo cáo Đồ án & Hồ sơ Nộp bài:* Soạn thảo Báo cáo kỹ thuật (Word/PDF) theo cấu trúc chuẩn của Khoa CNTT - HCMUS; tổng hợp bảng đối chiếu WBS.
  4. *Slide Thuyết trình & Video Demo Dự phòng:* Thiết kế slide trình diễn chuyên nghiệp bằng Tiếng Anh (hoặc Song ngữ Anh - Việt); quay và biên tập Video Demo Full HD (3 - 5 phút) có thuyết minh rõ ràng đề phòng sự cố mạng khi bảo vệ đồ án trước hội đồng.
* **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Hệ thống khởi động trơn tru 1-click qua `CHAY-DEMO.bat`.
  - [x] Bộ test suite `pytest` đạt độ bao phủ > 80%, tất cả test cases đều PASS xanh lá.
  - [x] Đường link website chạy trực tuyến ổn định 24/7 trên Internet.
  - [x] Slide thuyết trình và Video demo Full HD sẵn sàng 100% cho buổi bảo vệ đồ án.

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
│   ├── 04-prompt-ai-flow.md       # Thiết kế prompt Gemini và luồng đàm thoại 4 bước
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
│       │   ├── common/
│       │   │   └── RidePickerModal.jsx    # Pop-up đặt xe 3 hãng: Grab, Xanh SM, Be
│       │   └── chat/
│       │       └── ChatPanel.jsx          # Khung đàm thoại 4 bước với trợ lý AI
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
   * `feature/ai-gemini-flow` — **Lam** (Gemini AI & Luồng đàm thoại 4 bước)
   * `feature/be-transit-adaptive` — **Hạo** (Routing cước 3 xe & Kịch bản thích ứng)
   * `feature/devops-docker-ci` — **Đăng** (Docker, Pytest & Triển khai Cloud)
4. **Quy tắc Merge:** Mọi thành viên sau khi hoàn thành tính năng phải mở Pull Request (PR) vào nhánh `dev` và được Trưởng nhóm (Danh) phê duyệt sau khi đã test không xung đột.
