# 🌴 HCMC AI Travel Planner — Hệ Thống Lên Kế Hoạch Du Lịch TP.HCM Tích Hợp Trí Tuệ Nhân Tạo

[![Python Version](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI Version](https://img.shields.io/badge/FastAPI-0.111%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React Version](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://react.dev/)
[![Database](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![AI Engine](https://img.shields.io/badge/Google%20Gemini%20API-1.5%20Pro%2FFlash-orange.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Website hỗ trợ du khách lên lịch trình khám phá Thành phố Hồ Chí Minh thông minh, cá nhân hóa theo thời gian thực nhờ sự kết hợp giữa **Google Gemini API** (Function Calling & Structured JSON) và **Google Places API (New)**. Hệ thống giải quyết trọn vẹn bài toán tối ưu lộ trình di chuyển, phương án dự phòng thời tiết/kẹt xe giờ cao điểm, đồng bộ lịch Google Calendar và chia sẻ lịch trình du lịch chuyên nghiệp.

---

## ⚡ Quyết Định Công Nghệ Backend (Technology Architecture Decision)

> [!IMPORTANT]
> **Dự án chính thức sử dụng ngôn ngữ PYTHON (Framework FastAPI) cho toàn bộ hệ thống Backend thay vì Java/Spring Boot (hoặc Node.js).**
>
> **Lý do lựa chọn Python FastAPI cho đồ án:**
> 1. **Tối ưu hóa tuyệt đối cho AI & LLM:** Thư viện chính thức của Google (`google-generativeai`) được ưu tiên phát triển tốt nhất trên nền tảng Python, hỗ trợ Native Structured JSON Output, streaming token và Function Calling mượt mà.
> 2. **Hiệu năng cao & Tốc độ phát triển vượt trội:** FastAPI được xây dựng trên nền tảng Starlette và Pydantic, cho hiệu năng xử lý I/O bất đồng bộ (async/await) ngang ngửa Go và Node.js.
> 3. **Tự động sinh tài liệu chuẩn hóa Swagger UI:** Khi khởi chạy server, toàn bộ tài liệu đặc tả API tương tác được tự động sinh tại đường dẫn: `http://localhost:8000/docs`.
> 4. **Tinh gọn và dễ bảo trì cho nhóm sinh viên:** Cú pháp Python trong sáng, loại bỏ hàng loạt boilerplate code cồng kềnh của Java (XML, Bean configs, DTO/POJO rườm rà), giúp nhóm 7 thành viên phối hợp phát triển nhanh chóng và dễ dàng debug.

---

## 📌 7 Yêu Cầu Cốt Lõi Của Đồ Án (Chuẩn Giảng Viên Đề Ra)

1. **Bắt buộc đăng nhập (Mandatory Login):**
   - Khách (Guest) chỉ được xem Landing/Hero page giới thiệu tính năng.
   - Để sử dụng Chat AI, tạo lịch trình, xem bản đồ và đồng bộ Calendar, người dùng bắt buộc phải đăng nhập (JWT Bearer Token & Google OAuth 2.0).
   - Mục đích: AI nhận diện lịch sử trò chuyện, phân tích sở thích dài hạn và thói quen du lịch để cá nhân hóa lịch trình chính xác.

2. **Lời chào & Form nhập yêu cầu 8 tiêu chí + Luồng 4 bước + Đổi địa điểm (Swap Place):**
   - Form khảo sát ban đầu gồm: Số ngày, Quận lưu trú/tập trung (Quận 1, 3, 5, Thủ Đức...), Ngân sách, Sở thích du lịch, Số người tham gia, Phương tiện di chuyển, Nhịp độ (Thư thả / Vừa phải / Dày đặc), Ghi chú đặc biệt.
   - Luồng tương tác chuẩn 4 bước: `Nhập Form` ➔ `AI đưa gợi ý tổng quan & ý tưởng` ➔ `Người dùng xác nhận/góp ý` ➔ `AI sinh lịch trình chi tiết từng giờ`.
   - Tính năng **Đổi địa điểm (Swap Place)**: Khi người dùng không ưng ý một địa điểm, AI đề xuất 2-3 lựa chọn thay thế tương đương cùng khu vực và tự động tính toán lại lộ trình di chuyển.

3. **Bản đồ tương tác đa năng (Interactive Map):**
   - Khám phá các địa điểm tham quan, ẩm thực, văn hóa TP.HCM trực quan với Mapbox GL / Google Maps.
   - Hiển thị Mini-map card và Marker tọa độ trực tiếp trong khung chat và chi tiết lịch trình.

4. **Kịch bản xử lý rủi ro dự phòng thông minh (Contingency Planning):**
   - *Trời mưa/thời tiết xấu:* AI tự động chuyển các điểm ngoài trời sang cụm bảo tàng, trung tâm thương mại, workshop trong nhà.
   - *Kẹt xe giờ cao điểm (17h - 19h):* Gom cụm địa điểm cùng phường/quận, hạn chế di chuyển xuyên trục giao thông đông đúc.
   - *Địa điểm đóng cửa/sửa chữa:* Tự động kích hoạt cơ chế thay thế tức thì.
   - *Vượt ngân sách:* Gợi ý quán ăn bình dân, điểm tham quan miễn phí hoặc chi phí thấp.

5. **Bộ sưu tập hành trình (My Trips), Chia sẻ liên kết & Đánh giá AI:**
   - Quản lý danh sách chuyến đi đã tạo, xem lại lịch sử, gắn cờ chuyến đi yêu thích.
   - Chia sẻ hành trình công khai qua liên kết chỉ xem (`/s/:shareToken`) an toàn, có thể thu hồi bất cứ lúc nào.
   - Đánh giá chất lượng lịch trình AI tạo (1-5 sao + nhận xét) để tối ưu hóa bộ nhớ AI cho các chuyến đi sau.

6. **Tính năng đột phá — Tự động đồng bộ Google Calendar:**
   - Kết nối Google Calendar qua OAuth2 API.
   - Đẩy toàn bộ lịch trình từng ngày thành các sự kiện trên Calendar với đầy đủ mốc giờ, địa chỉ, mô tả và nhắc nhở thông báo trước 30 phút.

7. **Cá nhân hóa người dùng quay lại (Returning User Welcome):**
   - Chào mừng đích danh người dùng khi quay lại.
   - Tự động điền trước (pre-fill) form yêu cầu dựa trên lịch sử sở thích của các chuyến đi trước, cho phép điều chỉnh nhanh chỉ với 1 click.
   - Loại bỏ hoàn toàn tùy chọn nhân vật/giọng điệu AI (persona) để tập trung vào trợ lý du lịch chuyên nghiệp, khách quan và đáng tin cậy.

---

## 🗂️ Cấu Trúc Thư Mục Dự Án (Directory Structure)

Dự án áp dụng kiến trúc **Monorepo Full-Stack hiện đại** tách biệt rõ ràng giữa Client (Frontend SPA), Server (Python FastAPI) và Docs (Tài liệu kiến trúc đặc tả).

```plaintext
website-ai-travel/
├── .gitignore                     # Cấu hình bỏ qua file nhị phân, venv, node_modules, .env
├── docker-compose.yml             # Cấu hình container PostgreSQL 16 Alpine
├── README.md                      # Tài liệu tổng quan, cấu trúc dự án & phân công nhiệm vụ
│
├── docs/                          # TÀI LIỆU CỐT LÕI CỦA DỰ ÁN (Chỉ lưu tài liệu quan trọng)
│   ├── yeu-cau-moi.md             # Đặc tả chi tiết 7 yêu cầu mới của giảng viên
│   ├── user-flow.md               # Sơ đồ Mermaid luồng trải nghiệm người dùng từ đầu đến cuối
│   ├── ke-hoach-thuc-hien.md      # Kế hoạch WBS, tiến độ thực hiện và Definition of Done (DoD)
│   ├── thay-doi-so-voi-ke-hoach-cu.md # Bảng đối chiếu thay đổi so với phiên bản kế hoạch cũ
│   ├── kien-truc-api-db.md        # Kiến trúc kỹ thuật, mô hình dữ liệu DB và danh mục API
│   └── openapi.yaml               # Đặc tả kỹ thuật chuẩn OpenAPI 3.0 cho toàn bộ REST API
│
├── client/                        # FRONTEND SINGLE PAGE APPLICATION (React 18 + Vite)
│   ├── index.html                 # File HTML gốc của ứng dụng React
│   ├── package.json               # Quản lý thư viện phụ thuộc Frontend
│   ├── vite.config.js             # Cấu hình Vite build & dev proxy trỏ tới port 8000
│   ├── tailwind.config.js         # Cấu hình Tailwind CSS Design System
│   ├── postcss.config.js          # Cấu hình PostCSS plugin
│   │
│   └── src/                       # Mã nguồn ứng dụng Frontend
│       ├── main.jsx               # Điểm khởi chạy React DOM, gắn Context Providers
│       ├── App.jsx                # Router chính và thiết lập Protected Routes
│       ├── index.css              # File style toàn cục (Tailwind directives & custom utilities)
│       │
│       ├── assets/                # Tài nguyên tĩnh: Logo TP.HCM, icons SVG, hình ảnh minh họa
│       │
│       ├── components/            # Các UI Component tái sử dụng
│       │   ├── common/            # Component cơ bản: Button, Input, Modal, Toast, LoadingSpinner
│       │   ├── layout/            # Khung giao diện: Navbar, Sidebar, Footer, UserMenu
│       │   ├── chat/              # Giao diện hội thoại: MessageList, ChatInput, QuickSuggestions
│       │   ├── trip/              # Hiển thị lịch trình: DayTimeline, ActivityCard, SwapModal, RatingModal
│       │   └── map/               # Bản đồ: MapView, PlaceMarker, RouteLayer, MiniMapCard
│       │
│       ├── pages/                 # Các trang màn hình chính
│       │   ├── LandingPage.jsx    # Trang giới thiệu cho khách (Hero, tính năng, CTA đăng nhập)
│       │   ├── LoginPage.jsx      # Đăng nhập (Email/Password & Google OAuth button)
│       │   ├── RegisterPage.jsx   # Đăng ký tài khoản người dùng mới
│       │   ├── PlannerPage.jsx    # Màn hình chính: Lời chào, Form 8 tiêu chí, Khung chat AI & Lịch trình
│       │   ├── MyTripsPage.jsx    # Quản lý danh sách các chuyến đi đã tạo của người dùng
│       │   ├── TripDetailPage.jsx # Xem chi tiết, chỉnh sửa, swap địa điểm và đồng bộ Google Calendar
│       │   ├── SharedTripPage.jsx # Xem lịch trình được chia sẻ qua liên kết công khai (/s/:shareToken)
│       │   └── SettingsPage.jsx   # Cài đặt tài khoản, xem/sửa sở thích du lịch đã lưu
│       │
│       ├── context/               # Quản lý trạng thái toàn cục (React Context)
│       │   ├── AuthContext.jsx    # Trạng thái người dùng đăng nhập, token, login/logout
│       │   └── TripContext.jsx    # Trạng thái chuyến đi hiện tại, bản đồ và chat messages
│       │
│       ├── hooks/                 # Custom React Hooks
│       │   ├── useAuth.js         # Hook truy xuất AuthContext nhanh
│       │   ├── useTrip.js         # Hook truy xuất TripContext
│       │   └── useMap.js          # Hook điều khiển camera bản đồ, marker và polyline
│       │
│       └── services/              # Tầng giao tiếp HTTP Client (Axios)
│           ├── api.js             # Cấu hình Axios instance kèm JWT Interceptor
│           ├── authService.js     # Gọi API đăng nhập, đăng ký, lấy profile
│           ├── tripService.js     # Gọi API tạo form, sinh lịch trình, swap địa điểm, đánh giá
│           └── calendarService.js # Gọi API xác thực và đồng bộ Google Calendar
│
└── server/                        # BACKEND RESTFUL API & AI SERVICES (Python 3.11+ / FastAPI)
    ├── main.py                    # Điểm khởi chạy ứng dụng FastAPI và máy chủ Uvicorn
    ├── requirements.txt           # Quản lý gói thư viện Python (FastAPI, Pydantic, SQLAlchemy, Gemini...)
    ├── .env.example               # Mẫu khai báo biến môi trường (Database, Gemini, Google OAuth, JWT)
    │
    └── app/                       # Mã nguồn gói ứng dụng Backend Python
        ├── core/                  # Cấu hình cốt lõi & Bảo mật
        │   ├── config.py          # Quản lý Settings bằng Pydantic BaseSettings
        │   ├── security.py        # Băm mật khẩu bcrypt và mã hóa/giải mã JWT token
        │   └── dependencies.py    # FastAPI Dependency xác thực JWT (Bắt buộc đăng nhập - Yêu cầu 1)
        │
        ├── db/                    # Cơ sở dữ liệu
        │   ├── session.py         # Cấu hình SQLAlchemy Session & Connection Pool
        │   └── schema.sql         # DDL tạo bảng PostgreSQL (users, preferences, trips, days, activities, ratings)
        │
        ├── schemas/               # Pydantic Schemas validate dữ liệu đầu vào & đầu ra
        │   ├── user.py            # UserRegister, UserLogin, UserResponse, PreferenceUpdate
        │   ├── trip.py            # Form 8 tiêu chí, SwapPlaceInput, SwapPlaceResponse, RatingInput
        │   ├── ai.py              # ChatMessageInput, ChatResponse (hỗ trợ mini-map card)
        │   └── calendar.py        # CalendarSyncRequest, CalendarSyncResponse
        │
        ├── api/                   # Tầng điều hướng API Routers
        │   └── v1/
        │       ├── api.py         # Gắn kết toàn bộ router V1
        │       └── endpoints/
        │           ├── auth.py    # /api/v1/auth (đăng ký, đăng nhập, me, preferences)
        │           ├── trips.py   # /api/v1/trips (CRUD chuyến đi, swap địa điểm, My Trips, rating)
        │           ├── ai.py      # /api/v1/ai (chat tư vấn, gợi ý tổng quan, sinh lịch trình chi tiết)
        │           ├── places.py  # /api/v1/places (tìm kiếm địa điểm bản đồ qua Places API)
        │           └── calendar.py# /api/v1/calendar (tạo URL OAuth2 và đồng bộ Google Calendar)
        │
        ├── services/              # Tầng xử lý nghiệp vụ thông minh & tích hợp ngoài
        │   ├── gemini_service.py  # Gọi Google Generative AI (Gemini 1.5) với prompt địa lý TP.HCM
        │   ├── places_service.py  # Google Places API (New): geocoding, photo, rating, hours & fallback cache
        │   ├── calendar_service.py# Tạo sự kiện Google Calendar kèm báo thức trước 30 phút
        │   └── contingency_service.py # Xử lý dự phòng: trời mưa, kẹt xe giờ cao điểm (17h-19h), vượt ngân sách
        │
        └── utils/                 # Thư viện thuật toán dùng chung
            └── transit_calculator.py # Công thức Haversine tính khoảng cách & ước tính thời gian di chuyển TP.HCM
```

---

## 🔍 Phân Tích Chi Tiết Cấu Trúc Thư Mục & Vai Trò

### 1. Thư mục `docs/` — Tài Liệu Dự Án Chuẩn Hóa
- **Mục đích:** Lưu trữ tập trung các tài liệu kỹ thuật, kiến trúc phần mềm và đặc tả yêu cầu của đồ án.
- **Quy tắc:** Chỉ giữ lại các tài liệu quan trọng và chính thống theo đúng 7 yêu cầu mới của giảng viên; loại bỏ các file nháp, ghi chú dư thừa để đảm bảo tính đồng nhất cho toàn nhóm.
- **Nội dung:** Chứa đặc tả chi tiết 7 yêu cầu, sơ đồ luồng người dùng (User Flow), bản kế hoạch thực hiện (WBS & DoD), tài liệu kiến trúc cơ sở dữ liệu & API, cùng file OpenAPI 3.0 tiêu chuẩn.

### 2. Thư mục `client/` — Ứng Dụng Frontend (React + Vite + Tailwind CSS)
- **Mục đích:** Xây dựng giao diện Single Page Application (SPA) hiện đại, phản hồi nhanh, tối ưu trải nghiệm người dùng trên cả máy tính và thiết bị di động.
- **src/components:** Chứa các khối giao diện được chia nhỏ theo tính năng (chat, hiển thị lịch trình theo ngày, card địa điểm, modal đổi địa điểm, modal đánh giá sao và bản đồ tương tác).
- **src/pages:** Quản lý các màn hình chính: `LandingPage.jsx` chỉ dành cho khách xem giới thiệu tính năng; `PlannerPage.jsx` là không gian làm việc chính sau khi đăng nhập với form 8 tiêu chí và trợ lý AI; `TripDetailPage.jsx` cho phép xem toàn bộ lịch trình, swap địa điểm và đồng bộ Google Calendar; `SharedTripPage.jsx` phục vụ người xem bên ngoài qua liên kết rút gọn.
- **src/context:** Lưu trữ trạng thái phiên làm việc (`AuthContext`, `TripContext`).
- **src/services:** Chịu trách nhiệm gửi request HTTP lên Backend FastAPI (port 8000) qua Axios instance kèm JWT Interceptor.

### 3. Thư mục `server/` — Máy Chủ Backend (Python 3.11+ / FastAPI / PostgreSQL)
- **Mục đích:** Xử lý toàn bộ logic nghiệp vụ, xác thực JWT, cơ sở dữ liệu và tích hợp các dịch vụ AI/Cloud của Google.
- **server/app/core:** Quản lý cấu hình tập trung (`config.py`) và xử lý bảo mật băm mật khẩu, cấp phát/giải mã token JWT (`security.py`). Dependency `dependencies.py` thực thi nghiêm ngặt Yêu cầu 1: bắt buộc đăng nhập đối với mọi tài nguyên cá nhân.
- **server/app/schemas:** Sử dụng `Pydantic` để kiểm tra tính hợp lệ của dữ liệu gửi lên và định dạng dữ liệu trả về theo chuẩn JSON Schema, loại bỏ hoàn toàn nguy cơ lỗi định dạng.
- **server/app/services:** Trọng tâm xử lý kỹ thuật phức tạp:
  - `gemini_service.py`: Tương tác với Google Gemini 1.5 Pro/Flash, thiết kế System Instruction am hiểu tường tận văn hóa ẩm thực và địa bàn các quận TP.HCM.
  - `places_service.py`: Tra cứu thông tin địa điểm thật qua Google Places API (New) kèm bộ đệm cache khi mất mạng.
  - `contingency_service.py`: Xử lý các kịch bản dự phòng khi trời mưa (chuyển sang điểm trong nhà), né kẹt xe giờ cao điểm (17h-19h) và điểm tham quan đóng cửa.
  - `calendar_service.py`: Tạo sự kiện lịch trên Google Calendar của người dùng kèm thông báo trước 30 phút.
- **server/app/utils/transit_calculator.py:** Hỗ trợ tính toán khoảng cách địa lý theo công thức Haversine và ước lượng thời gian di chuyển theo từng loại phương tiện tại TP.HCM.

---

## 👥 Bảng Phân Công Nhiệm Vụ Thành Viên (Nhóm 7 Người)

> [!IMPORTANT]
> **Quy tắc phân công nhân sự đồ án:**
> - **Frontend (Giao diện SPA React 18):** Do **01 người duy nhất** (Thành viên 1) phụ trách toàn diện từ A - Z (UI/UX, Components, 8 màn hình, Bản đồ client, Quản lý State và kết nối Axios).
> - **Các phần còn lại (Backend, AI, CSDL, Thuật toán, Tích hợp & DevOps/QA):** Được **chia đều cho 06 người** (Thành viên 2 đến Thành viên 7) theo từng module chuyên biệt, đảm bảo khối lượng công việc cân bằng, rõ ràng và không chồng chéo.
> - Cột **Họ và tên người phụ trách** được để trống để nhóm trưởng phân bổ trực tiếp tên từng thành viên vào đồ án.

| STT | Vị trí / Vai trò chuyên môn | Họ và tên người phụ trách | Thư mục & File phụ trách chính | Nhiệm vụ chi tiết (Cần làm gì) | Yêu cầu chuẩn đầu ra (Deliverables & DoD) |
| :---: | :---|:---:|:---|---|---|
| **1** | **Frontend Lead** *(Phụ trách toàn bộ Frontend - 1 người duy nhất)* | | client/ (Toàn bộ mã nguồn phía Client):<br>• client/index.html<br>• client/vite.config.js<br>• client/tailwind.config.js<br>• client/postcss.config.js<br>• client/src/index.css<br>• client/src/components/common/ (Button.jsx, Input.jsx, Modal.jsx, Toast.jsx, LoadingSpinner.jsx)<br>• client/src/components/layout/ (Navbar.jsx, Sidebar.jsx, Footer.jsx, UserMenu.jsx)<br>• client/src/components/chat/ (MessageList.jsx, ChatInput.jsx, QuickSuggestions.jsx)<br>• client/src/components/trip/ (DayTimeline.jsx, ActivityCard.jsx, SwapModal.jsx, RatingModal.jsx)<br>• client/src/components/map/ (MapView.jsx, PlaceMarker.jsx, RouteLayer.jsx, MiniMapCard.jsx)<br>• client/src/pages/ (LandingPage.jsx, LoginPage.jsx, RegisterPage.jsx, PlannerPage.jsx, MyTripsPage.jsx, TripDetailPage.jsx, SharedTripPage.jsx, SettingsPage.jsx)<br>• client/src/context/ (AuthContext.jsx, TripContext.jsx)<br>• client/src/hooks/ (useAuth.js, useTrip.js, useMap.js)<br>• client/src/services/ (pi.js, uthService.js, 	ripService.js, calendarService.js) | • Thiết kế toàn bộ giao diện Design System chuẩn Responsive (Desktop & Mobile) theo docs/10a-ui-design-system.md.<br>• Hiện thực trọn vẹn 8 màn hình (Pages) theo docs/10b-ui-wireframes.md: Landing (dành cho khách vãng lai kèm CTA đăng nhập), Login/Register, Planner Studio (Form 8 tiêu chí + Chat AI), My Trips, Trip Detail, Shared Trip (liên kết chỉ xem) và Settings.<br>• Tích hợp bản đồ tương tác (Mapbox GL/Google Maps): Vẽ marker đánh số, đường đi polyline, tương tác 2 chiều với Timeline.<br>• Hiện thực Mini-map card hiển thị ngay trong bong bóng chat AI khi trả lời về địa điểm.<br>• Xây dựng các Modal chức năng: Modal Đổi địa điểm (Swap Place), Modal Đánh giá sao (1-5 sao), Modal Đồng bộ Google Calendar.<br>• Quản lý trạng thái toàn cục với React Context (AuthContext bảo vệ route đăng nhập, TripContext lưu trữ lịch trình đang tạo).<br>• Cấu hình Axios Client (pi.js) tự động đính kèm Header JWT Bearer Token và xử lý mã lỗi toàn cục. | • Toàn bộ ứng dụng Frontend SPA hoạt động mượt mà, trực quan, không có lỗi console.<br>• Lệnh 
pm run build tạo gói production thành công 100% không cảnh báo.<br>• Khách chưa đăng nhập bị chặn không thể vào Planner/Trips (Yêu cầu 1).<br>• Giao diện hiển thị sắc nét, responsive 100% trên cả máy tính và điện thoại. |
| **2** | **Backend Developer — Core, Security & User Preferences** | | server/app/core/:<br>• config.py<br>• security.py<br>• dependencies.py<br>server/app/api/v1/endpoints/auth.py<br>server/app/schemas/user.py<br>server/main.py | • Thiết lập cấu hình hệ thống tập trung với Pydantic BaseSettings đọc biến môi trường từ .env.<br>• Cấu hình CORS middleware, Exception Handlers toàn cục chuẩn hóa cấu trúc lỗi JSON.<br>• Xây dựng hàm băm mật khẩu bảo mật một chiều bằng thuật toán crypt.<br>• Hiện thực cấp phát, ký và xác minh JWT Access Token (hạn 24h) và Refresh Token an toàn.<br>• **Thực thi nghiêm ngặt Yêu cầu 1:** Viết FastAPI dependency get_current_user bắt buộc đăng nhập cho mọi endpoint dữ liệu cá nhân, trả về HTTP 401 Unauthorized nếu thiếu/sai token.<br>• Xây dựng các API xác thực: POST /api/v1/auth/register, POST /api/v1/auth/login, GET /api/v1/auth/me.<br>• **Thực thi Yêu cầu 7 (Returning User):** Xây dựng API GET /api/v1/auth/preferences & PUT /api/v1/auth/preferences lưu trữ ngân sách và sở thích du lịch dài hạn để tự động điền trước (pre-fill) form khi người dùng quay lại. | • Module Core và Security bảo mật tuyệt đối, chống bypass token.<br>• Chặn đứng 100% request trái phép khi chưa đăng nhập.<br>• Hệ thống lưu và nhớ thói quen du lịch của người dùng cũ hoạt động chính xác.<br>• Đạt chuẩn kiểm thử Unit test cho toàn bộ module mã hóa mật khẩu và giải mã JWT. |
| **3** | **Backend Developer — Database & HCMC Data Engineer** | | server/app/db/:<br>• schema.sql<br>• session.py<br>• hcmc_data.py<br>server/app/api/v1/endpoints/places.py<br>server/app/services/places_service.py | • Thiết kế lược đồ cơ sở dữ liệu quan hệ hoàn chỉnh trong schema.sql với đầy đủ Foreign Keys, Constraints, Indexes: 6 bảng (users, user_preferences, 	rips, 	rip_days, 	rip_activities, 	rip_ratings).<br>• Thiết lập kết nối SQLAlchemy Session Pool hỗ trợ cả SQLite (local) và PostgreSQL (production).<br>• Thu thập, chuẩn hóa và số hóa bộ dữ liệu hạt nhân 100+ địa điểm du lịch, ẩm thực, văn hóa nổi tiếng tại TP.HCM (Quận 1, 3, 5, Thủ Đức, Bình Thạnh...).<br>• Định dạng siêu dữ liệu chi tiết cho từng điểm: Tên chuẩn, Địa chỉ, Tọa độ GPS (lat, lng), Giờ mở cửa/đóng cửa, Chi phí dự kiến, Phân loại indoor vs outdoor (*dùng cho kịch bản trời mưa*), Thể loại (Văn hóa, Ẩm thực, Cà phê, Lịch sử...).<br>• Xây dựng places_service.py và API GET /api/v1/places/search, GET /api/v1/places/{id}: Tra cứu địa điểm theo từ khóa, lọc theo quận và thể loại; tích hợp Google Places API (New) lấy ảnh và rating thực tế. | • File schema.sql khởi tạo CSDL thành công 100% không lỗi cú pháp.<br>• Bộ dữ liệu địa điểm TP.HCM phong phú, tọa độ GPS chính xác 100% trên bản đồ thực.<br>• API Places phản hồi cực nhanh (< 100ms) nhờ tối ưu hóa indexing và cache dữ liệu.<br>• Tích hợp cơ chế fallback dữ liệu cục bộ khi không có kết nối internet. |
| **4** | **Backend Developer — AI Core & Gemini LLM Engineer** | | server/app/services/gemini_service.py<br>server/app/api/v1/endpoints/ai.py<br>server/app/schemas/ai.py | • Tích hợp Google Gemini API qua thư viện chính thức google-generativeai (Gemini 1.5 Pro / Flash).<br>• Thiết kế System Instruction chuyên sâu am hiểu địa lý, thời tiết, văn hóa và ẩm thực hẻm TP.HCM; **loại bỏ hoàn toàn persona/giọng điệu nhân vật** theo đúng Yêu cầu 7 của giảng viên.<br>• **Hiện thực Luồng 4 bước tạo lịch trình chuẩn (Yêu cầu 2):**<br>&nbsp;&nbsp;1. *Bước 1:* Tiếp nhận form 8 tiêu chí.<br>&nbsp;&nbsp;2. *Bước 2:* AI phân tích sinh gợi ý tổng quan (High-level summary, chủ đề, điểm nhấn từng ngày).<br>&nbsp;&nbsp;3. *Bước 3:* Nhận trao đổi/phản hồi điều chỉnh từ người dùng qua khung chat.<br>&nbsp;&nbsp;4. *Bước 4:* Sinh lịch trình chi tiết từng giờ bằng **Native Structured JSON Output** (ép chuẩn Pydantic Schema).<br>• Xây dựng API POST /api/v1/ai/chat: Chatbot tư vấn, tự động trả về place_card (tọa độ, tên điểm) để render Mini-map card trong chat (Yêu cầu 3).<br>• Xây dựng cơ chế retry tự động và fallback template khi AI gặp sự cố nghẽn mạng/rate-limit. | • Các endpoint /api/v1/ai/suggest, /api/v1/ai/generate, /api/v1/ai/chat chạy ổn định.<br>• 100% lịch trình chi tiết trả về đúng cấu trúc JSON Schema, phân bổ giờ giấc khoa học, không bị hallucination sai địa lý TP.HCM.<br>• Tính năng Mini-map card trả về đúng tọa độ của địa điểm được nhắc đến. |
| **5** | **Backend Developer — Algorithm & Smart Logistics** | | server/app/utils/transit_calculator.py<br>server/app/services/contingency_service.py<br>server/app/schemas/trip.py (Swap schemas)<br>server/app/api/v1/endpoints/trips.py (Swap logic) | • Triển khai công thức Haversine tính toán khoảng cách đại vòng chính xác giữa 2 tọa độ GPS.<br>• Xây dựng hàm ước lượng thời gian di chuyển theo loại phương tiện (đi bộ, xe máy, taxi/ô tô) phù hợp với thực tế giao thông TP.HCM.<br>• **Hiện thực Tính năng Đổi địa điểm — Swap Place (Yêu cầu 2):**<br>&nbsp;&nbsp;• Thuật toán tìm 2-3 địa điểm thay thế tương đương (cùng thể loại, cùng quận hoặc bán kính lân cận < 2 km).<br>&nbsp;&nbsp;• Endpoint POST /api/v1/trips/{id}/swap-suggestions: Trả về danh sách địa điểm đề xuất.<br>&nbsp;&nbsp;• Endpoint POST /api/v1/trips/{id}/swap: Cập nhật địa điểm mới và tự động tính lại thời gian di chuyển chặng đó.<br>• **Hiện thực Hệ thống Kịch bản Dự phòng — Contingency Planning (Yêu cầu 4):**<br>&nbsp;&nbsp;• *Trời mưa:* Tự động quét các điểm ngoài trời (outdoor) chuyển sang điểm trong nhà (indoor).<br>&nbsp;&nbsp;• *Giờ cao điểm (17h - 19h):* Tự động gom cụm các địa điểm gần nhau, hạn chế tối đa di chuyển xuyên các trục đường kẹt xe.<br>&nbsp;&nbsp;• *Điểm đóng cửa hoặc Vượt ngân sách:* Tự động đề xuất điểm thay thế tương đương giá rẻ hoặc miễn phí. | • Thuật toán tính cự ly và thời gian di chuyển có độ chính xác cao (sai số < 10% so với Google Maps).<br>• Tính năng Swap gợi ý chính xác 2-3 điểm tương đương trong thời gian < 300ms.<br>• Kịch bản dự phòng thời tiết mưa và né kẹt xe 17h-19h vận hành thông minh, tự động điều chỉnh lịch trình hợp lý. |
| **6** | **Backend Developer — Integrations & Trip Services** | | server/app/services/calendar_service.py<br>server/app/api/v1/endpoints/calendar.py<br>server/app/api/v1/endpoints/trips.py<br>server/app/schemas/calendar.py | • Xây dựng bộ API quản lý hành trình (My Trips - Yêu cầu 5): GET /api/v1/trips, GET /api/v1/trips/{id}, DELETE /api/v1/trips/{id}, cập nhật trạng thái chuyến đi.<br>• **Hiện thực Chia sẻ Liên kết Công khai — Read-only Share Link (Yêu cầu 5):**<br>&nbsp;&nbsp;• Endpoint POST /api/v1/trips/{id}/share: Sinh mã token ngẫu nhiên bảo mật (uuid4).<br>&nbsp;&nbsp;• Endpoint GET /api/v1/trips/public/{share_token}: Cho phép người ngoài xem toàn bộ lịch trình chỉ đọc (Read-only) không cần đăng nhập và không có quyền sửa/xóa.<br>&nbsp;&nbsp;• Hỗ trợ chủ sở hữu thu hồi (revoke) liên kết chia sẻ bất kỳ lúc nào.<br>• **Hiện thực Đánh giá Chất lượng Lịch trình (Yêu cầu 5):** Endpoint POST /api/v1/trips/{id}/rating tiếp nhận đánh giá 1-5 sao và nhận xét của người dùng.<br>• **Hiện thực Tính năng Đột phá — Đồng bộ Google Calendar (Yêu cầu 6):**<br>&nbsp;&nbsp;• *Phương thức 1:* Sinh đường dẫn tạo sự kiện nhanh (Google Calendar Web Template Link).<br>&nbsp;&nbsp;• *Phương thức 2:* Tích hợp Google Calendar API (OAuth2), tự động tạo hàng loạt Event cho từng hoạt động theo đúng ngày giờ, kèm cấu hình thông báo nhắc nhở trước **đúng 30 phút**. | • Bộ API My Trips hoạt động chuẩn xác, truy vấn nhanh.<br>• Cơ chế Share Link an toàn, chặn hoàn toàn các hành vi chỉnh sửa trái phép từ người xem bên ngoài.<br>• Endpoint đánh giá sao lưu trữ thành công dữ liệu vào bảng 	rip_ratings.<br>• Đồng bộ thành công toàn bộ sự kiện lịch trình sang Google Calendar thực tế kèm thông báo nhắc trước 30 phút. |
| **7** | **QA, DevOps & System Architect** | | docker-compose.yml<br>server/tests/ (Toàn bộ kiểm thử tự động)<br>docs/openapi.yaml<br>docs/13-demo-qa.md<br>docs/14-checklist.md<br>
un_all.bat, 
un_backend.bat, 
un_frontend.bat | • Đóng gói toàn bộ hệ thống bằng Docker & Docker Compose: Cấu hình container FastAPI, container PostgreSQL 16 và mạng nội bộ giữa các container.<br>• Xây dựng các script khởi chạy 1-click tiện lợi trên môi trường Windows (
un_all.bat).<br>• **Xây dựng Bộ Kiểm thử Tự động Toàn diện (server/tests/ qua pytest và httpx):**<br>&nbsp;&nbsp;• Viết Unit Tests cho các hàm thuật toán: 	ransit_calculator.py, băm mật khẩu, mã hóa JWT token.<br>&nbsp;&nbsp;• Viết Integration Tests cho toàn bộ API Endpoints: Auth (đăng ký/đăng nhập đúng và sai), chặn truy cập không có token (Yêu cầu 1), CRUD Trips, Swap địa điểm, Google Calendar link.<br>&nbsp;&nbsp;• Triển khai kỹ thuật Mocking cho Gemini API và Google OAuth để test chạy độc lập, tốc độ cao và không tốn chi phí gọi API thật.<br>• Duy trì và chuẩn hóa file đặc tả kỹ thuật tiêu chuẩn docs/openapi.yaml (OpenAPI 3.0).<br>• **Xây dựng Kịch bản Live Demo & Bộ câu hỏi bảo vệ đồ án (docs/13-demo-qa.md):**<br>&nbsp;&nbsp;• Soạn kịch bản phân vai 7 thành viên trình diễn 5 luồng tính năng trực tiếp trước giảng viên.<br>&nbsp;&nbsp;• Chuẩn bị sẵn bộ câu hỏi - trả lời phản biện chuyên sâu về kiến trúc, bảo mật và AI. | • Hệ thống khởi động trọn vẹn chỉ với 1 câu lệnh (docker-compose up hoặc 
un_all.bat).<br>• Bộ test suite pytest đạt độ bao phủ (coverage) > 80%, tất cả test cases đều PASS (xanh lá).<br>• File OpenAPI 3.0 hợp lệ 100%, import được vào Swagger UI / Postman.<br>• Kịch bản demo và tài liệu phản biện sẵn sàng 100% cho buổi bảo vệ đồ án trước giảng viên. |

---

## 📚 Danh Mục Tài Liệu Kỹ Thuật (Trong thư mục `docs/`)

Tất cả tài liệu quan trọng của dự án được lưu trữ tại thư mục `docs/` để phục vụ quá trình bảo vệ đồ án:

| Tên File | Vai Trò & Nội Dung Chi Tiết |
|---|---|
| [**yeu-cau-moi.md**](docs/yeu-cau-moi.md) | Phân tích chi tiết 7 yêu cầu mới của giảng viên, các kịch bản sử dụng thực tế và tiêu chí nghiệm thu. |
| [**user-flow.md**](docs/user-flow.md) | Sơ đồ luồng trải nghiệm người dùng tổng thể (Mermaid Flowchart) từ lúc ghé thăm trang, đăng nhập, nhập form đến nhận lịch trình và đồng bộ Calendar. |
| [**ke-hoach-thuc-hien.md**](docs/ke-hoach-thuc-hien.md) | Kế hoạch phân rã công việc WBS theo các Sprint, tiến độ bàn giao và chuẩn nghiệm thu từng tính năng (Definition of Done). |
| [**thay-doi-so-voi-ke-hoach-cu.md**](docs/thay-doi-so-voi-ke-hoach-cu.md) | Bảng so sánh đối chiếu những điểm khác biệt giữa tài liệu cũ và 7 yêu cầu mới của giảng viên. |
| [**kien-truc-api-db.md**](docs/kien-truc-api-db.md) | Thiết kế kiến trúc kỹ thuật hệ thống, sơ đồ quan hệ cơ sở dữ liệu (ERD) và danh mục các RESTful API. |
| [**openapi.yaml**](docs/openapi.yaml) | Bản đặc tả kỹ thuật tiêu chuẩn OpenAPI 3.0 đầy đủ cho toàn bộ hệ thống API, dùng để import vào Swagger UI hoặc Postman. |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Dự Án (Quick Start Guide)

### 1. Yêu Cầu Môi Trường
- **Python**: Phiên bản 3.11 hoặc 3.12.
- **Node.js**: Phiên bản 18.x hoặc 20.x LTS.
- **PostgreSQL**: Phiên bản 16 (khuyến khích chạy qua Docker).
- **Docker & Docker Compose** (Khuyến nghị cho môi trường cơ sở dữ liệu).

### 2. Khởi Chạy Cơ Sở Dữ Liệu Bằng Docker
```bash
# Khởi động PostgreSQL 16 Alpine container ở chế độ background
docker compose up -d

# Kiểm tra trạng thái container
docker compose ps
```

### 3. Cài Đặt & Cấu Hình Máy Chủ Backend (Python FastAPI)
```bash
cd server

# Khởi tạo môi trường ảo Python
python -m venv venv

# Kích hoạt môi trường ảo:
# Trên Windows:
.\venv\Scripts\activate
# Trên macOS / Linux:
source venv/bin/activate

# Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# Tạo file cấu hình môi trường từ mẫu
cp .env.example .env

# Chỉnh sửa file .env với API Keys của nhóm (Gemini API, Google OAuth, Database URL)

# Khởi chạy server FastAPI với Uvicorn (Hot-reload)
uvicorn main:app --reload --port 8000
```
> 📡 **Backend API:** `http://localhost:8000`  
> 📖 **Interactive Swagger UI Documentation:** `http://localhost:8000/docs`

### 4. Cài Đặt & Khởi Chạy Ứng Dụng Frontend (React + Vite)
```bash
cd client

# Cài đặt thư viện phụ thuộc
npm install

# Khởi chạy ứng dụng với Vite
npm run dev
```
> 🌐 **Frontend Application:** `http://localhost:5173`

---

## 🔒 Bản Quyền & Giấy Phép

Đồ án được phát triển phục vụ mục đích học tập và nghiên cứu trong khuôn khổ môn học. Mọi quyền được bảo lưu theo giấy phép [MIT License](LICENSE).
