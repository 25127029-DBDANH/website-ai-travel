# 👥 BẢNG PHÂN CÔNG NHIỆM VỤ ĐỒ ÁN MÔN HỌC (NHÓM 7)
## ĐỒ ÁN: WEBSITE AI LẬP KẾ HOẠCH DU LỊCH TP. HỒ CHÍ MINH (*SÀI GÒN GUIDE*)
**Môn học:** Tư Duy Tính Toán (CSC10014) — Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM  
**Kho mã nguồn GitHub:** [`https://github.com/25127029-DBDANH/website-ai-travel`](https://github.com/25127029-DBDANH/website-ai-travel)  
**Thời gian cập nhật:** 12/11/2026

---

## I. BẢNG TỔNG QUAN PHÂN CÔNG 7 THÀNH VIÊN

| STT | Thành viên | Vai trò / Chức danh | Mảng phụ trách chính | Sản phẩm bàn giao cốt lõi (Deliverables) |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Diệp Bảo Danh** *(Trưởng nhóm - 25127029)* | **Frontend Lead & System Architect** | Khung 1 Bản đồ Leaflet, Khung 2 Timeline 3 tầng, Chế độ Đi thực tế (Companion Mode), Tích hợp gọi xe 3 app (Grab / Xanh SM / Be) | Source code Map/Timeline/Live View, Điều phối Git & Kiến trúc tổng thể |
| **2** | **Phạm Gia Hưng** | **Frontend Developer & UI/UX Specialist** | Tab 3 Sổ chi tiêu & Di chuyển, Tab 4 Tổng kết chuyến đi, Xuất Thẻ kỷ niệm Story Card Canvas, Tối ưu Responsive Mobile | Source code ExpenseTracker, TripSummary, StoryCard, Giao diện Mobile |
| **3** | **Đỗ Nguyễn An Khang** | **Backend Lead & Authentication Service** | Kiến trúc RESTful API, Xác thực JWT & Google OAuth 2.0, Bộ API quản lý chuyến đi (CRUD Trip), Chia sẻ chuyến đi công khai | Mô-đun Auth, Trip API Controller, Tự tích hợp và test trực tiếp với Frontend |
| **4** | **Ngô Tấn Đạt** | **Database & Data Engineer** | Thiết kế CSDL PostgreSQL, Bộ đệm địa điểm Cache (TTL 7 ngày), Seed data 30+ địa điểm TP.HCM, Tích hợp Google Places API | Schema SQL, Database Migrations, Script Seed Data, Tự tích hợp dữ liệu với Frontend |
| **5** | **Lê Hữu Lam** | **AI Engine & Prompt Engineer** | Tích hợp Google Gemini API, Prompt Structured JSON, Khung đàm thoại 4 bước, Logic AI Đổi địa điểm thông minh (Smart Swap) | Mô-đun Gemini Service, Bộ Prompt Template, Tự tích hợp và test trực tiếp với Frontend |
| **6** | **Đàng Minh Hạo** | **Backend Developer — Routing & Adaptive** | Thuật toán tính cước xe Grab/XanhSM/Be theo cự ly, Động cơ thích ứng (Kịch bản Trời mưa Sài Gòn & Giờ cao điểm), Xuất lịch .ICS | Mô-đun Transit Calculator, Adaptive Engine, ICS Calendar Exporter, Tự tích hợp FE |
| **7** | **Đoàn Hải Đăng** | **DevOps, QA Lead & Thuyết trình Dự án** | Docker hóa môi trường, Deploy Cloud (Vercel/Render/Supabase), Bộ test cases & QA pytest, Báo cáo kỹ thuật Word/PDF, Slide & Video Demo | Link Web Live 24/7, Báo cáo hoàn chỉnh, Bộ Slide thuyết trình, Video clip demo |

---

## II. BẢN MÔ TẢ CHI TIẾT NHIỆM VỤ, TRÁCH NHIỆM & TIÊU CHÍ HOÀN THÀNH (DoD)

### 1. DIỆP BẢO DANH — FRONTEND LEAD & SYSTEM ARCHITECT (TRƯỞNG NHÓM - 25127029)
* **Vị trí cốt lõi:** Phụ trách Frontend, Quản lý kho mã nguồn và Kiến trúc hệ thống.
* **Nhiệm vụ cụ thể:**
  1. Quản lý tiến độ chung của toàn dự án, phân bổ công việc, giải quyết xung đột mã nguồn (merge conflict) trên repository GitHub.
  2. **Khung 1 (Bản đồ Leaflet tương tác):** Thiết kế bản đồ thời gian thực, vẽ markers số thứ tự [1, 2, 3, 4], vẽ đường dẫn nối chặng (polyline), tự động đổi marker thành dấu tích xanh `✓` khi chặng được check-in.
  3. **Khung 2 (Lịch trình Timeline 3 tầng):** Xây dựng bố cục 3 tầng không bao giờ bị tràn/đè chữ với địa điểm tên dài, nút *Accept (Chốt điểm)*, nút *Đổi địa điểm (Swap)*, logic khóa không cho đổi điểm đối với các chặng đã ghé thăm.
  4. **Tab 2 (Chế độ Đi thực tế Companion):** Thẻ Hero hiển thị điểm đến tiếp theo, nút chỉ đường Google Maps, tích hợp Modal gọi xe 3 hãng (**Grab, Xanh SM, Be**) với cước ước tính và deep-link mở app, nút *"Hoàn thành chuyến đi"* chuyển trang mượt mà.
* **Tiêu chí hoàn thành (DoD):** Giao diện 2 khung hình hoạt động trơn tru trên Desktop/Laptop; đồng bộ trạng thái giữa Bản đồ, Timeline và Chế độ thực tế tức thì.

---

### 2. PHẠM GIA HƯNG — FRONTEND DEVELOPER & UI/UX SPECIALIST
* **Vị trí cốt lõi:** Phụ trách Frontend, Quản lý Chi tiêu, Báo cáo Tổng kết & Giao diện Mobile.
* **Nhiệm vụ cụ thể:**
  1. **Tab 3 (Sổ chi tiêu so với ngân sách):** Hiển thị chi tiết tiền vé tham quan, bữa ăn và **từng chặng xe di chuyển**; tính năng bấm sửa cước xe trực tiếp (*Inline fare editing*); bộ lọc danh mục và biểu đồ tiến độ ngân sách.
  2. **Tab 4 (Giao diện Tổng kết chuyến đi - Trip Summary):** Báo cáo 4 chỉ số KPI quan trọng, cơ cấu chi tiêu 3 nhóm (Hoạt động - Ăn uống - Di chuyển), lịch sử lộ trình từng ngày kèm album ảnh check-in thực tế.
  3. **Xuất Thẻ kỷ niệm (Story Card Canvas):** Lập trình sinh ảnh đồ họa tổng kết chuyến đi (tỷ lệ 9:16 Story / 1:1 Square) cho phép người dùng bấm tải ảnh về máy để chia sẻ mạng xã hội.
  4. **Form khảo sát 8 tiêu chí & Khung Chatbot đàm thoại 4 bước:** Xây dựng giao diện thu thập nhu cầu du khách tại trang chủ `/`.
  5. **Tối ưu Responsive di động (Mobile First):** Tinh chỉnh CSS/Tailwind đảm bảo toàn bộ ứng dụng hiển thị hoàn hảo, không bị tràn ngang hay vỡ khung khi du khách thao tác trên điện thoại thông minh ngoài trời.
* **Tiêu chí hoàn thành (DoD):** Sổ chi tiêu tính toán tiền chính xác; giao diện tổng kết đẹp mắt, tạo cảm xúc; ứng dụng responsive mượt mà trên iPhone/Android.

---

### 3. ĐỖ NGUYỄN AN KHANG — BACKEND LEAD & AUTHENTICATION SERVICE
* **Vị trí cốt lõi:** Kiến trúc API Backend, Xác thực Người dùng & Quản lý Dữ liệu Chuyến đi.
* **Nhiệm vụ cụ thể:**
  1. Thiết lập khung dự án Backend (FastAPI Python), chuẩn hóa cấu trúc thư mục (Controllers, Services, Models, Routes, Middlewares).
  2. **Hệ thống Xác thực (Auth Service):**
     * Đăng ký, đăng nhập tài khoản bằng email & mật khẩu, mã hóa an toàn bằng thuật toán `bcrypt`.
     * Cấp phát và xác thực JWT Token trong header `Authorization: Bearer <token>` để bảo vệ tài nguyên người dùng.
     * Tích hợp Google OAuth 2.0 (Google Sign-In) cho phép đăng nhập nhanh an toàn.
  3. **Hệ thống API Chuyến đi (Trip API):**
     * `POST /api/v1/trips`: Lưu chuyến đi mới tạo từ AI.
     * `GET /api/v1/trips/{id}`: Lấy dữ liệu chi tiết lịch trình.
     * `PATCH /api/v1/trips/{id}/stops/{stopId}`: Cập nhật trạng thái chặng (`visited`, ghi chú, ảnh).
     * `GET /api/v1/trips/me`: Lấy danh sách lịch sử các chuyến đi của người dùng đã đăng nhập.
     * `POST /api/v1/trips/{id}/share`: API chia sẻ chuyến đi công khai cho bạn bè qua token bảo mật.
  4. **YÊU CẦU TỰ TÍCH HỢP & TEST:** **Khang chịu trách nhiệm tự kết nối API với Frontend AuthModal và TripPage, tự kiểm thử cho tới khi luồng đăng nhập và quản lý chuyến đi chạy trơn tru.**
* **Tiêu chí hoàn thành (DoD):** Xác thực an toàn 100%, bảo mật JWT đúng chuẩn RFC 7519; CRUD chuyến đi phản hồi nhanh dưới 100ms.

---

### 4. NGÔ TẤN ĐẠT — DATABASE & DATA ENGINEER
* **Vị trí cốt lõi:** Thiết kế CSDL PostgreSQL, Chiến lược Cache & Dữ liệu Địa điểm Sài Gòn.
* **Nhiệm vụ cụ thể:**
  1. Thiết kế Lược đồ CSDL quan hệ (PostgreSQL Relational Schema): Bảng `users`, `trips`, `itinerary_items`, `expenses`, `places_cache`.
  2. Viết các script migration CSDL tự động hóa tạo bảng và quan hệ khóa ngoại (Foreign Keys), tạo Index tìm kiếm tối ưu.
  3. Xây dựng chiến lược Cache địa điểm (`places_cache`) với TTL 7 ngày: Giảm thiểu 80% số lượng request gọi Google Places API bên thứ 3.
  4. Thu thập và viết script mồi dữ liệu (`hcmc_data.py`): Khởi tạo sẵn hơn 30+ địa danh nổi tiếng bậc nhất TP.HCM (Dinh Độc Lập, Chợ Bến Thành, Bến Bạch Đằng, Landmark 81, Phở Dậu, Cơm tấm Ba Ghiền,... đầy đủ tọa độ, giá vé, giờ mở cửa và link ảnh).
  5. **YÊU CẦU TỰ TÍCH HỢP & TEST:** **Đạt chịu trách nhiệm đảm bảo dữ liệu địa điểm từ CSDL nạp lên hiển thị đầy đủ và chuẩn xác trên Bản đồ Leaflet (TripMap.jsx) và TimelineItem.jsx.**
* **Tiêu chí hoàn thành (DoD):** CSDL triển khai hoàn tất trên Supabase/PostgreSQL; script seed chạy thành công chỉ với 1 lệnh; tốc độ query địa điểm dưới 30ms.

---

### 5. LÊ HỮU LAM — AI ENGINE & PROMPT SPECIALIST (GEMINI INTEGRATION)
* **Vị trí cốt lõi:** Tích hợp Google Gemini AI, Kỹ thuật Prompt & Khung đàm thoại.
* **Nhiệm vụ cụ thể:**
  1. Tích hợp SDK Google Gemini API (`gemini-2.5-flash`): Quản lý an toàn API Key, xử lý Rate Limiting, Retry Logic và Fallback dữ liệu khi mất kết nối mạng.
  2. **Kỹ thuật Prompt Engineering chuyên sâu:**
     * Viết System Instructions định vị AI là *"Chuyên gia Du lịch Bản địa TP.HCM am hiểu sâu sắc văn hóa, ẩm thực và đường sá Sài Gòn"*.
     * Cung cấp các ví dụ mẫu (Few-shot learning) về các thói quen sinh hoạt và lịch trình chuẩn tại Sài Gòn.
  3. **Triển khai Gemini Structured Output / Function Calling:**
     * Ràng buộc chặt chẽ Schema JSON đầu ra của Gemini, đảm bảo 100% kết quả trả về là JSON hợp lệ theo đúng cấu trúc giao diện Frontend yêu cầu, không bao giờ bị lỗi format text.
  4. **Luồng đàm thoại thông minh 4 bước (Multi-turn Chat):** Khảo sát thời gian & nhóm người đi -> Tìm hiểu mức ngân sách -> Khảo sát gu ẩm thực & sở thích cốt lõi -> Đề xuất lịch trình mẫu và chủ động hỏi gợi ý điều chỉnh.
  5. **Logic AI Đổi địa điểm thông minh (Smart Swap):** Xây dựng hàm prompt nhận lý do muốn đổi điểm từ người dùng và tự động tìm 3-4 địa điểm thay thế tương đương cùng khu vực và chi phí.
  6. **YÊU CẦU TỰ TÍCH HỢP & TEST:** **Lam chịu trách nhiệm kết nối trực tiếp API Gemini vào Khung Chat (ChatPanel.jsx) và SwapModal.jsx, tự test đàm thoại thời gian thực cho tới khi phản hồi AI hoàn hảo.**
* **Tiêu chí hoàn thành (DoD):** Gemini sinh lịch trình 100% chuẩn JSON; thời gian phản hồi AI trung bình dưới 3-5 giây; câu trả lời tiếng Việt tự nhiên, am hiểu địa phương.

---

### 6. ĐÀNG MINH HẠO — BACKEND DEVELOPER (ROUTING, TRANSIT & ADAPTIVE LOGIC)
* **Vị trí cốt lõi:** Thuật toán Tuyến đường, Ước tính Cước xe & Động cơ Kịch bản Thích ứng.
* **Nhiệm vụ cụ thể:**
  1. **Mô-đun Tính toán Tuyến đường (Transit Calculator):** Triển khai thuật toán tính cự ly địa lý (Haversine Formula) giữa các tọa độ GPS điểm đi và điểm đến.
  2. **Thuật toán ước tính cước xe 3 hãng:**
     * GrabBike / GrabCar (Biểu giá mở cửa + giá mỗi km tiếp theo).
     * Xanh SM Bike / Xanh SM Taxi (Đội xe thuần điện VinFast).
     * BeBike / BeCar.
  3. **Động cơ Kịch bản Thích ứng (Adaptive Engine):**
     * **Kịch bản Trời mưa Sài Gòn:** Khi người dùng bật kịch bản, hệ thống tự động lọc thay thế các điểm ngoài trời thành điểm có mái che; đồng thời chuyển phương thức di chuyển sang ô tô/taxi có mái che.
     * **Kịch bản Giờ cao điểm TP.HCM (17h00 - 19h00):** Tự động phát hiện chặng rơi vào khung giờ kẹt xe, tự động cộng thêm thời gian đệm (+15 đến +30 phút) và ưu tiên chọn các điểm đến lân cận trong cùng một quận.
  4. **Xuất lịch trình chuẩn quốc tế `.ICS`:** Xây dựng hàm tạo file iCalendar tương thích Google Calendar, Apple Calendar và Outlook, kèm thông báo nhắc trước 30 phút.
  5. **YÊU CẦU TỰ TÍCH HỢP & TEST:** **Hạo chịu trách nhiệm kết nối bảng cước xe vào RidePickerModal.jsx và ExpenseTrackerView.jsx của Frontend; tự kiểm thử các nút kịch bản thích ứng trên TripPage.jsx.**
* **Tiêu chí hoàn thành (DoD):** Khoảng cách tính toán có sai số dưới 5%; cước ước tính sát thực tế; chuyển đổi kịch bản thích ứng linh hoạt; file `.ICS` nhập vào điện thoại hiển thị chuẩn xác.

---

### 7. ĐOÀN HẢI ĐĂNG — DEVOPS, QA LEAD & THUYẾT TRÌNH DỰ ÁN
* **Vị trí cốt lõi:** Triển khai Hạ tầng Cloud, Đảm bảo Chất lượng, Slide Thuyết trình & Video Demo.
* **Nhiệm vụ cụ thể:**
  1. **Thiết lập Hạ tầng & Triển khai Cloud (DevOps):**
     * Viết `Dockerfile` và `docker-compose.yml` giúp các thành viên chạy toàn bộ hệ thống đồng nhất chỉ với một câu lệnh.
     * Triển khai phiên bản Production lên Cloud: Frontend lên Vercel, Backend lên Render, Database lên Supabase.
  2. **Đảm bảo Chất lượng & Kiểm thử (QA & Testing):**
     * Xây dựng Bộ kịch bản kiểm thử (Test Plan & Test Cases): Kiểm thử chức năng, tích hợp API, kiểm thử UI/E2E và kiểm tra các tình huống biên.
  3. **Biên soạn Báo cáo Kỹ thuật Đồ án (Documentation):**
     * Tổng hợp và hoàn thiện Báo cáo đồ án môn học (Word/PDF) theo cấu trúc chuẩn của Khoa CNTT - ĐHKHTN.
  4. **Thiết kế Slide Thuyết trình & Video Demo:**
     * Thiết kế bộ Slide thuyết trình chuyên nghiệp bằng Tiếng Anh (hoặc Song ngữ Anh-Việt).
     * Luyện tập kịch bản thuyết trình và phân bổ thời lượng trả lời phản biện (Q&A) của Giảng viên.
     * Quay và biên tập Video Demo chất lượng cao Full HD (3-5 phút) có thuyết minh rõ ràng dự phòng trường hợp sự cố mạng phòng thi.
* **Tiêu chí hoàn thành (DoD):** Website chạy ổn định 24/7 trên link trực tuyến công khai; bộ hồ sơ nộp bài đầy đủ báo cáo, slide, video demo chất lượng cao.

---

## III. QUY TRÌNH PHỐI HỢP NHÓM & QUY CHUẨN GIT

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
