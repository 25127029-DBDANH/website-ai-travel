# 🚀 KẾ HOẠCH THỰC HIỆN TOÀN DIỆN & PHÂN CÔNG NHIỆM VỤ NHÓM 7
## ĐỒ ÁN MÔN HỌC: TƯ DUY TÍNH TOÁN (CSC10014) — HCMUS
**Đề tài:** Website AI Lập Kế Hoạch Du Lịch TP. Hồ Chí Minh (*Sài Gòn Guide*)  
**Repository:** [`https://github.com/25127029-DBDANH/website-ai-travel`](https://github.com/25127029-DBDANH/website-ai-travel)  
**Thời gian cập nhật:** 12/11/2026

---

## 1. BẢNG PHÂN CÔNG CÔNG VIỆC 7 THÀNH VIÊN (TEAM RACI MATRIX)

| STT | Họ và Tên | Vai trò chính | Mảng phụ trách & File sở hữu | Tiêu chuẩn nghiệm thu (Definition of Done) |
|:---:|---|---|---|---|
| **1** | **Diệp Bảo Danh**<br>*(Trưởng nhóm - 25127029)* | **Frontend Lead & System Architect** | • **Khung 1 Bản đồ Leaflet:** `TripMap.jsx`<br>• **Khung 2 Timeline 3 tầng:** `TimelineItem.jsx`, `ItineraryPanel.jsx`<br>• **Chế độ Đi thực tế:** `LiveCompanionView.jsx`<br>• **Tích hợp gọi xe 3 hãng:** `RidePickerModal.jsx` (Grab, XanhSM, Be) | • 100% bố cục 3 tầng không bị đè/tràn chữ tên dài.<br>• Bản đồ đổi pin sang dấu tích xanh `✓` khi chặng hoàn tất.<br>• Chặng hoàn tất không gạch ngang tên, khóa nút đổi điểm.<br>• Deep-link mở app Grab, Xanh SM, Be hoạt động chuẩn. |
| **2** | **Phạm Gia Hưng** | **Frontend Developer & UI/UX Specialist** | • **Tab 3 Sổ chi tiêu & Di chuyển:** `ExpenseTrackerView.jsx`<br>• **Tab 4 Tổng kết chuyến đi:** `TripSummaryView.jsx`<br>• **Xuất Thẻ ảnh kỷ niệm:** `StoryCardModal.jsx`, `lib/story-card.js`<br>• **Form 8 tiêu chí & Chatbot 4 bước:** `TripForm.jsx`, `ChatPanel.jsx`<br>• **Tối ưu Mobile First:** `styles.css` | • Cho phép du khách tự do nhấp sửa cước xe thực tế inline.<br>• Màn hình tổng kết hiển thị đầy đủ 4 KPI và album ảnh check-in.<br>• Xuất ảnh Story Card canvas 9:16/1:1 chất lượng cao.<br>• Giao diện không bị tràn/vỡ khung trên điện thoại thông minh. |
| **3** | **Đỗ Nguyễn An Khang** | **Backend Lead & Authentication Service** | • **Khung Backend:** `server/main.py`, `server/app/core/`<br>• **Auth Service (JWT & Google OAuth):** `server/app/api/v1/endpoints/auth.py`, `server/app/core/security.py`<br>• **CRUD Chuyến đi:** `server/app/api/v1/endpoints/trips.py`<br>• **Liên kết chia sẻ:** `POST /api/v1/trips/{id}/share` | • Xác thực JWT chuẩn RFC 7519, mã hóa bcrypt an toàn.<br>• Google OAuth 2.0 đăng nhập 1-chạm.<br>• **Tự tích hợp và test trực tiếp với Frontend AuthModal & TripPage** cho đến khi luồng E2E mượt mà. |
| **4** | **Ngô Tấn Đạt** | **Database & Data Engineer** | • **CSDL PostgreSQL Schema:** `server/app/db/schema.sql`, `session.py`<br>• **Seed Data 30+ địa điểm TP.HCM:** `server/app/db/hcmc_data.py`<br>• **Cache địa điểm (TTL 7 ngày):** `server/app/services/places_service.py`<br>• **Google Places API New:** `server/app/api/v1/endpoints/places.py` | • CSDL quan hệ chuẩn hóa 3NF, có Index tối ưu.<br>• Script seed nạp 30+ địa điểm nổi tiếng Sài Gòn chỉ trong 1 lệnh.<br>• Cache giảm 80% request gọi Google Places, phản hồi < 30ms.<br>• **Tự tích hợp dữ liệu với Frontend TripMap & TimelineItem.** |
| **5** | **Lê Hữu Lam** | **AI Engine & Prompt Engineer** | • **Google Gemini API (2.5 Flash):** `server/app/services/gemini_service.py`<br>• **Structured JSON Schema:** `server/app/schemas/ai.py`<br>• **Luồng đàm thoại 4 bước:** `server/app/api/v1/endpoints/ai.py`<br>• **Logic Smart Swap:** Prompt tìm 3-4 điểm thay thế tương đương | • Gemini sinh kết quả 100% hợp lệ JSON, không bao giờ vỡ format.<br>• Thời gian phản hồi AI trung bình < 3-5 giây.<br>• Chatbot 4 bước hỏi sở thích tự nhiên, giàu văn hóa bản địa TP.HCM.<br>• **Tự tích hợp và test trực tiếp với Frontend ChatPanel & SwapModal.** |
| **6** | **Đàng Minh Hạo** | **Backend Developer — Routing & Adaptive** | • **Tính cước xe Grab/XanhSM/Be:** `server/app/utils/transit_calculator.py`<br>• **Động cơ Kịch bản Thích ứng:** `server/app/services/contingency_service.py` (Trời mưa & Giờ cao điểm TP.HCM)<br>• **Xuất file lịch .ICS:** `server/app/services/calendar_service.py` | • Công thức Haversine tính cự ly sai số < 5% so với Google Maps.<br>• Ước tính cước xe 3 hãng Grab/XanhSM/Be sát thực tế.<br>• Kịch bản mưa tự đổi sang điểm có mái che; kịch bản cao điểm đệm +20p.<br>• **Tự tích hợp với Frontend RidePickerModal & ExpenseTrackerView.** |
| **7** | **Đoàn Hải Đăng** | **DevOps, QA Lead & Thuyết trình Dự án** | • **Docker hóa:** `Dockerfile`, `docker-compose.yml`<br>• **Triển khai Cloud:** Vercel (Frontend), Render (Backend), Supabase (DB)<br>• **Bộ kiểm thử tự động:** `server/tests/` (pytest, E2E test cases)<br>• **Tài liệu & Thuyết trình:** Báo cáo kỹ thuật Word/PDF, Slide, Video Demo | • Hệ thống chạy 1-click qua `CHAY-DEMO.bat` hoặc Docker.<br>• Bộ test suite pytest PASS 100% không cảnh báo lỗi.<br>• Website live 24/7 trên link trực tuyến công khai.<br>• Slide thuyết trình và Video demo Full HD (3-5 phút) chuẩn bị chu đáo. |

---

## 2. BẢNG DANH MỤC NHIỆM VỤ WBS CHI TIẾT (THEO HIỆN TRẠNG WEB MỚI NHẤT)

| Mã | Phân nhóm | Nhiệm vụ cụ thể | Ưu tiên | Người phụ trách | File liên quan |
|:---:|---|---|:---:|:---:|---|
| **FE-01** | Frontend | Bố cục 2 khung hình song song (Bản đồ Leaflet & Timeline) | P0 | Diệp Bảo Danh | `client/src/pages/TripPage.jsx` |
| **FE-02** | Frontend | Thẻ lịch trình 3 tầng chống tràn/đè chữ với tên địa điểm dài | P0 | Diệp Bảo Danh | `client/src/components/itinerary/TimelineItem.jsx` |
| **FE-03** | Frontend | Đổi pin bản đồ thành dấu tích xanh `✓`, khóa nút đổi điểm khi đã check-in | P0 | Diệp Bảo Danh | `client/src/components/itinerary/TripMap.jsx` |
| **FE-04** | Frontend | Chế độ Đi thực tế thời gian thực (Hero Card, Chỉ đường, Check-in, Hoàn thành) | P0 | Diệp Bảo Danh | `client/src/components/companion/LiveCompanionView.jsx` |
| **FE-05** | Frontend | Tích hợp Modal gọi xe 3 hãng: Grab, Xanh SM (xe điện), Be với cước ước tính | P0 | Diệp Bảo Danh | `client/src/components/common/RidePickerModal.jsx` |
| **FE-06** | Frontend | Sổ chi tiêu tích hợp các chặng xe di chuyển & cho phép chỉnh sửa cước inline | P0 | Phạm Gia Hưng | `client/src/components/companion/ExpenseTrackerView.jsx` |
| **FE-07** | Frontend | Màn hình Tổng kết chuyến đi (4 KPI, cơ cấu 3 nhóm tiền, album ảnh check-in) | P0 | Phạm Gia Hưng | `client/src/components/companion/TripSummaryView.jsx` |
| **FE-08** | Frontend | Xuất Thẻ ảnh kỷ niệm Story Card Canvas (9:16 / 1:1) tải về máy | P0 | Phạm Gia Hưng | `client/src/components/companion/StoryCardModal.jsx` |
| **FE-09** | Frontend | Tinh chỉnh Responsive Mobile First, mượt mà khi đi du lịch ngoài đường | P0 | Phạm Gia Hưng | `client/src/styles.css` |
| **BE-01** | Backend | Khung FastAPI, cấu hình CORS, Router V1 và Swagger UI `/docs` | P0 | Đỗ Nguyễn An Khang | `server/main.py`, `server/app/api/v1/api.py` |
| **BE-02** | Backend | Xác thực JWT Token, mã hóa mật khẩu bcrypt, bảo vệ private endpoints | P0 | Đỗ Nguyễn An Khang | `server/app/core/security.py`, `endpoints/auth.py` |
| **BE-03** | Backend | Tích hợp Google OAuth 2.0 (Google Sign-In) | P0 | Đỗ Nguyễn An Khang | `server/app/api/v1/endpoints/auth.py` |
| **BE-04** | Backend | API quản lý chuyến đi (CRUD Trips, My Trips, Chia sẻ công khai) | P0 | Đỗ Nguyễn An Khang | `server/app/api/v1/endpoints/trips.py` |
| **DB-01** | Database | Thiết kế lược đồ PostgreSQL (users, trips, items, expenses, places_cache) | P0 | Ngô Tấn Đạt | `server/app/db/schema.sql` |
| **DB-02** | Database | Thu thập và nạp Seed Data 30+ địa danh du lịch, ẩm thực đặc sắc TP.HCM | P0 | Ngô Tấn Đạt | `server/app/db/hcmc_data.py` |
| **DB-03** | Database | Xây dựng chiến lược bộ đệm Cache địa điểm với TTL 7 ngày | P0 | Ngô Tấn Đạt | `server/app/services/places_service.py` |
| **AI-01** | AI Engine | Tích hợp Google Gemini 2.5 Flash SDK với System Instructions Sài Gòn | P0 | Lê Hữu Lam | `server/app/services/gemini_service.py` |
| **AI-02** | AI Engine | Ràng buộc Structured Output JSON Schema (triệt tiêu lỗi định dạng) | P0 | Lê Hữu Lam | `server/app/schemas/ai.py` |
| **AI-03** | AI Engine | Luồng đàm thoại 4 bước (Submit -> Gợi ý concept -> Đồng ý -> Lịch trình chi tiết) | P0 | Lê Hữu Lam | `server/app/api/v1/endpoints/ai.py` |
| **AI-04** | AI Engine | Logic AI Đổi địa điểm thông minh (Smart Swap 3-4 điểm tương đương) | P0 | Lê Hữu Lam | `server/app/services/gemini_service.py` |
| **RT-01** | Routing | Thuật toán Haversine tính cự ly và ước tính cước 3 hãng Grab/XanhSM/Be | P0 | Đàng Minh Hạo | `server/app/utils/transit_calculator.py` |
| **RT-02** | Routing | Động cơ thích ứng: Kịch bản Trời mưa Sài Gòn & Giờ cao điểm TP.HCM | P0 | Đàng Minh Hạo | `server/app/services/contingency_service.py` |
| **RT-03** | Routing | API xuất lịch trình chuẩn quốc tế .ICS (Google Calendar / Apple Calendar) | P0 | Đàng Minh Hạo | `server/app/services/calendar_service.py` |
| **DO-01** | DevOps | Đóng gói Docker Compose và Batch scripts 1-click (`CHAY-DEMO.bat`, `run_all.bat`) | P0 | Đoàn Hải Đăng | `docker-compose.yml`, `CHAY-DEMO.bat` |
| **DO-02** | DevOps | Triển khai phiên bản Production lên Cloud (Vercel, Render, Supabase) | P0 | Đoàn Hải Đăng | `docs/09-deploy.md` |
| **DO-03** | QA/Testing| Bộ test suite tự động pytest, kiểm tra biên và phục hồi khi mất kết nối mạng | P0 | Đoàn Hải Đăng | `server/tests/` |
| **DO-04** | QA/Testing| Slide thuyết trình (Tiếng Anh/Song ngữ) và Video demo sản phẩm Full HD | P0 | Đoàn Hải Đăng | `docs/13-demo-qa.md` |
