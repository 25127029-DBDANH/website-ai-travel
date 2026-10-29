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
> - **Frontend (Toàn bộ Client SPA React 18):** Do **01 người duy nhất** (Thành viên 1) phụ trách toàn diện từ A - Z (UI/UX, Components, 8 màn hình, Bản đồ client, Quản lý State và kết nối Axios).
> - **Các phần còn lại (Backend, AI, CSDL, Thuật toán, Tích hợp & DevOps/QA):** Được **chia đều cho 06 người** (Thành viên 2 đến Thành viên 7) theo từng module chuyên biệt, đảm bảo khối lượng công việc cân bằng, rõ ràng và không chồng chéo.
> - Cột **Họ và tên người phụ trách** được để trống để nhóm trưởng phân bổ trực tiếp tên từng thành viên vào đồ án.

### 📊 Bảng Ma Trận Phân Công Tổng Hợp (WBS Summary Matrix)

| STT | Họ và tên người phụ trách | Vị trí / Vai trò chuyên môn | Thư mục & File chính | Trọng tâm công việc | Chuẩn đầu ra (Deliverables) |
| :---: | :---: | :---|:---|---|---|
| **1** | Hưng | **Frontend Lead**<br>*(Toàn bộ Client)* | `client/`<br>• `src/pages/` (8 màn hình)<br>• `src/components/` (map, chat, trip)<br>• `src/context/`, `src/services/` | • Thiết kế Design System & Responsive UI<br>• Dựng 8 màn hình (Landing, Login, Planner...)<br>• Tích hợp Bản đồ Mapbox & Mini-map card trong chat<br>• Dựng Modal Swap Place, Đánh giá sao, Đồng bộ Calendar | • Ứng dụng SPA hoàn chỉnh, `npm run build` thành công 100%<br>• Giao diện mượt mà, chuẩn Responsive Mobile & Desktop<br>• Chặn khách chưa đăng nhập vào Planner/Trips (Yêu cầu 1) |
| **2** | Khang | **Backend Core & Security**<br>*(Auth, Bảo mật & User Profile)* | `server/app/core/`<br>• `security.py`, `dependencies.py`<br>`server/app/api/v1/endpoints/auth.py`<br>`server/app/schemas/user.py` | • Thiết lập cấu hình hệ thống Pydantic BaseSettings & CORS<br>• Băm mật khẩu bcrypt, cấp phát & xác thực JWT Token<br>• Dependency `get_current_user` bắt buộc đăng nhập (Yêu cầu 1)<br>• API lưu sở thích người dùng cũ & điền trước Form (Yêu cầu 7) | • Module Auth bảo mật cao, chặn 100% request không có token<br>• Endpoint `/register`, `/login`, `/me` ổn định<br>• API lưu & gợi nhớ sở thích người dùng cũ chạy chính xác |
| **3** | Đạt | **Database & Data Engineer**<br>*(CSDL & Dữ liệu thực tế TP.HCM)* | `server/app/db/`<br>• `schema.sql`, `session.py`<br>• `hcmc_data.py`<br>`server/app/api/v1/endpoints/places.py` | • Thiết kế 6 bảng quan hệ (Users, Trips, Activities...)<br>• Thu thập & số hóa 100+ địa điểm TP.HCM thực tế<br>• Siêu dữ liệu tọa độ GPS, giờ mở cửa, chi phí, cờ indoor/outdoor<br>• Places API tìm kiếm, lọc theo quận/thể loại & fallback cache | • CSDL quan hệ chuẩn hóa 3NF, không xung đột khóa ngoại<br>• Dữ liệu 100+ địa điểm TP.HCM chuẩn xác tọa độ thực tế<br>• API tra cứu địa điểm phản hồi nhanh dưới 100ms |
| **4** | Lam | **AI Core & Gemini LLM Engineer**<br>*(Google Gemini & Luồng 4 bước)* | `server/app/services/gemini_service.py`<br>`server/app/api/v1/endpoints/ai.py`<br>`server/app/schemas/ai.py` | • Tích hợp Google Gemini API (`gemini-1.5-flash`/`pro`)<br>• System Prompt am hiểu sâu sắc TP.HCM; loại bỏ persona thừa<br>• Hiện thực Luồng 4 bước (Form ➔ Gợi ý ➔ Chốt ➔ Lịch trình chi tiết)<br>• Chatbot tư vấn du lịch kèm Mini-map card trong chat (Yêu cầu 3) | • 100% kết quả lịch trình trả về đúng Native Structured JSON<br>• Lịch trình chi tiết từng giờ khoa học, không bị hallucination<br>• Thẻ Mini-map card trả về đúng tọa độ địa điểm trong chat |
| **5** | Danh | **Algorithm & Smart Logistics**<br>*(Định tuyến, Swap Place & Rủi ro)* | `server/app/utils/transit_calculator.py`<br>`server/app/services/contingency_service.py`<br>`server/app/api/v1/endpoints/trips.py` | • Công thức Haversine tính cự ly & thời gian di chuyển đô thị<br>• Tính năng Đổi địa điểm (Swap Place): tìm 2-3 điểm tương đương<br>• Xử lý kịch bản Trời mưa (chuyển điểm ngoài trời sang trong nhà)<br>• Xử lý Giờ cao điểm 17h-19h (gom cụm điểm, hạn chế xuyên quận) | • Thuật toán định tuyến sai số < 10% so với Google Maps<br>• Tính năng Swap gợi ý 2-3 điểm tương đương trong < 300ms<br>• Kịch bản dự phòng mưa và né kẹt xe tự động điều chỉnh hợp lý |
| **6** | Hạo | **Integrations & Trip Services**<br>*(My Trips, Share Link & Calendar)* | `server/app/services/calendar_service.py`<br>`server/app/api/v1/endpoints/calendar.py`<br>`server/app/api/v1/endpoints/trips.py` | • Quản lý danh mục chuyến đi My Trips (CRUD & lưu lịch sử)<br>• Chia sẻ hành trình công khai qua liên kết chỉ xem (`/s/:token`)<br>• Tiếp nhận đánh giá chất lượng lịch trình 1-5 sao (Yêu cầu 5)<br>• Đồng bộ Google Calendar tự động kèm thông báo nhắc trước 30 phút | • API My Trips & Share Link an toàn, người ngoài chỉ được xem<br>• Đánh giá sao lưu trữ thành công vào bảng `trip_ratings`<br>• Đồng bộ lịch trình sang Google Calendar chuẩn xác từng mốc giờ |
| **7** | Đăng | **QA, DevOps & System Architect**<br>*(Kiểm thử, Docker, CI/CD & Demo)* | `docker-compose.yml`, `Dockerfile`<br>`server/tests/` (Unit & Integration tests)<br>`docs/openapi.yaml`, `docs/13-demo-qa.md`<br>`run_all.bat`, `run_backend.bat` | • Đóng gói toàn bộ hệ thống bằng Docker Compose & Batch scripts<br>• Bộ test suite tự động toàn diện bằng `pytest` (> 80% coverage)<br>• Mocking Gemini API và Google OAuth để test nhanh, độc lập<br>• Chuẩn hóa đặc tả OpenAPI 3.0 & Kịch bản Live Demo bảo vệ đồ án | • Khởi chạy 1-click thành công qua Docker hoặc `run_all.bat`<br>• Tất cả test cases đều PASS (xanh 100%) trước khi merge code<br>• Kịch bản và slide demo sẵn sàng 100% cho buổi bảo vệ đồ án |

---

### 📝 Bản Đặc Tả Nhiệm Vụ Chi Tiết Từng Thành Viên (Detailed WBS & DoD)

#### 👤 Thành viên 1: Frontend Lead (Phụ trách toàn bộ Frontend — 01 Người Duy Nhất)
- **Họ và tên người phụ trách:** `Phạm Gia Hưng
- **Mã số sinh viên (MSSV):** `
- **Thư mục & File phụ trách:**
  - Cấu hình & Giao diện chung: `client/index.html`, `client/vite.config.js`, `client/tailwind.config.js`, `client/src/index.css`
  - Các Component dùng chung: `client/src/components/common/` (`Button.jsx`, `Input.jsx`, `Modal.jsx`, `Toast.jsx`, `LoadingSpinner.jsx`)
  - Khung giao diện: `client/src/components/layout/` (`Navbar.jsx`, `Sidebar.jsx`, `Footer.jsx`, `UserMenu.jsx`)
  - Khung chat AI: `client/src/components/chat/` (`MessageList.jsx`, `ChatInput.jsx`, `QuickSuggestions.jsx`)
  - Hiển thị lịch trình: `client/src/components/trip/` (`DayTimeline.jsx`, `ActivityCard.jsx`, `SwapModal.jsx`, `RatingModal.jsx`)
  - Bản đồ tương tác: `client/src/components/map/` (`MapView.jsx`, `PlaceMarker.jsx`, `RouteLayer.jsx`, `MiniMapCard.jsx`)
  - 8 Màn hình giao diện: `client/src/pages/` (`LandingPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `PlannerPage.jsx`, `MyTripsPage.jsx`, `TripDetailPage.jsx`, `SharedTripPage.jsx`, `SettingsPage.jsx`)
  - Quản lý trạng thái & API Client: `client/src/context/` (`AuthContext.jsx`, `TripContext.jsx`), `client/src/hooks/` (`useAuth.js`, `useTrip.js`, `useMap.js`), `client/src/services/` (`api.js`, `authService.js`, `tripService.js`, `calendarService.js`)
- **Nhiệm vụ cần làm chi tiết:**
  1. Thiết kế toàn bộ giao diện Design System chuẩn Responsive (Desktop & Mobile) theo tài liệu `docs/10a-ui-design-system.md`.
  2. Dựng 8 màn hình (Pages) theo `docs/10b-ui-wireframes.md`: Landing (chỉ dành cho khách vãng lai kèm CTA đăng nhập), Login/Register, Planner Studio (Form 8 tiêu chí + Chat AI), My Trips, Trip Detail, Shared Trip (liên kết chỉ xem) và Settings.
  3. Tích hợp bản đồ tương tác (Mapbox GL/Google Maps): Vẽ marker đánh số, đường đi polyline, tương tác 2 chiều với Timeline.
  4. Hiện thực Mini-map card hiển thị ngay trong bong bóng chat AI khi trả lời về địa điểm (Yêu cầu 3).
  5. Xây dựng các Modal chức năng: Modal Đổi địa điểm (Swap Place), Modal Đánh giá sao (1-5 sao), Modal Đồng bộ Google Calendar.
  6. Quản lý trạng thái toàn cục với React Context (`AuthContext` bảo vệ route đăng nhập, `TripContext` lưu trữ lịch trình đang tạo).
  7. Cấu hình Axios Client (`api.js`) tự động đính kèm Header JWT Bearer Token và xử lý mã lỗi toàn cục.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Toàn bộ ứng dụng Frontend SPA hoạt động mượt mà, trực quan, không có lỗi console.
  - [x] Lệnh `npm run build` tạo gói production thành công 100% không cảnh báo.
  - [x] Khách chưa đăng nhập bị chặn không thể vào Planner/Trips (Yêu cầu 1).
  - [x] Giao diện hiển thị sắc nét, responsive 100% trên cả máy tính và điện thoại.

---

#### 👤 Thành viên 2: Backend Developer — Core, Security & User Preferences
- **Họ và tên người phụ trách:** `Đỗ Nguyễn An Khang
- **Mã số sinh viên (MSSV):** `
- **Thư mục & File phụ trách:**
  - `server/app/core/` (`config.py`, `security.py`, `dependencies.py`)
  - `server/app/api/v1/endpoints/auth.py`
  - `server/app/schemas/user.py`
  - `server/.env.example`, `server/main.py`
- **Nhiệm vụ cần làm chi tiết:**
  1. Thiết lập cấu hình hệ thống tập trung với Pydantic BaseSettings đọc biến môi trường từ `.env`.
  2. Cấu hình CORS middleware, Exception Handlers toàn cục chuẩn hóa cấu trúc lỗi JSON.
  3. Xây dựng hàm băm mật khẩu bảo mật một chiều bằng thuật toán `bcrypt`.
  4. Hiện thực cấp phát, ký và xác minh JWT Access Token (hạn 24h) và Refresh Token an toàn.
  5. **Thực thi nghiêm ngặt Yêu cầu 1:** Viết FastAPI dependency `get_current_user` bắt buộc đăng nhập cho mọi endpoint dữ liệu cá nhân, trả về HTTP 401 Unauthorized nếu thiếu/sai token.
  6. Xây dựng các API xác thực: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
  7. **Thực thi Yêu cầu 7 (Returning User):** Xây dựng API `GET /api/v1/auth/preferences` & `PUT /api/v1/auth/preferences` lưu trữ ngân sách và sở thích du lịch dài hạn để tự động điền trước (pre-fill) form khi người dùng quay lại.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Module Core và Security bảo mật tuyệt đối, chống bypass token.
  - [x] Chặn đứng 100% request trái phép khi chưa đăng nhập.
  - [x] Hệ thống lưu và nhớ thói quen du lịch của người dùng cũ hoạt động chính xác.
  - [x] Đạt chuẩn kiểm thử Unit test cho toàn bộ module mã hóa mật khẩu và giải mã JWT.

---

#### 👤 Thành viên 3: Backend Developer — Database & HCMC Data Engineer
- **Họ và tên người phụ trách:** `Ngô Tấn Đạt
- **Mã số sinh viên (MSSV):** `
- **Thư mục & File phụ trách:**
  - `server/app/db/` (`schema.sql`, `session.py`, `hcmc_data.py`)
  - `server/app/api/v1/endpoints/places.py`
  - `server/app/services/places_service.py`
- **Nhiệm vụ cần làm chi tiết:**
  1. Thiết kế lược đồ cơ sở dữ liệu quan hệ hoàn chỉnh trong `schema.sql` với đầy đủ Foreign Keys, Constraints, Indexes: 6 bảng (`users`, `user_preferences`, `trips`, `trip_days`, `trip_activities`, `trip_ratings`).
  2. Thiết lập kết nối SQLAlchemy Session Pool hỗ trợ cả SQLite (local) và PostgreSQL (production).
  3. Thu thập, chuẩn hóa và số hóa bộ dữ liệu hạt nhân 100+ địa điểm du lịch, ẩm thực, văn hóa nổi tiếng tại TP.HCM (Quận 1, 3, 5, Thủ Đức, Bình Thạnh...).
  4. Định dạng siêu dữ liệu chi tiết cho từng điểm: Tên chuẩn, Địa chỉ, Tọa độ GPS (lat, lng), Giờ mở cửa/đóng cửa, Chi phí dự kiến, Phân loại `indoor` vs `outdoor` (*dùng cho kịch bản trời mưa*), Thể loại (Văn hóa, Ẩm thực, Cà phê, Lịch sử...).
  5. Xây dựng `places_service.py` và API `GET /api/v1/places/search`, `GET /api/v1/places/{id}`: Tra cứu địa điểm theo từ khóa, lọc theo quận và thể loại; tích hợp Google Places API (New) lấy ảnh và rating thực tế.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] File `schema.sql` khởi tạo CSDL thành công 100% không lỗi cú pháp.
  - [x] Bộ dữ liệu địa điểm TP.HCM phong phú, tọa độ GPS chính xác 100% trên bản đồ thực.
  - [x] API Places phản hồi cực nhanh (< 100ms) nhờ tối ưu hóa indexing và cache dữ liệu.
  - [x] Tích hợp cơ chế fallback dữ liệu cục bộ khi không có kết nối internet.

---

#### 👤 Thành viên 4: Backend Developer — AI Core & Gemini LLM Engineer
- **Họ và tên người phụ trách:** `Lê Hữu Lam
- **Mã số sinh viên (MSSV):** `
- **Thư mục & File phụ trách:**
  - `server/app/services/gemini_service.py`
  - `server/app/api/v1/endpoints/ai.py`
  - `server/app/schemas/ai.py`
- **Nhiệm vụ cần làm chi tiết:**
  1. Tích hợp Google Gemini API qua thư viện chính thức `google-generativeai` (Gemini 1.5 Pro / Flash).
  2. Thiết kế System Instruction chuyên sâu am hiểu địa lý, thời tiết, văn hóa và ẩm thực hẻm TP.HCM; **loại bỏ hoàn toàn persona/giọng điệu nhân vật** theo đúng Yêu cầu 7 của giảng viên.
  3. **Hiện thực Luồng 4 bước tạo lịch trình chuẩn (Yêu cầu 2):**
     - *Bước 1:* Tiếp nhận form 8 tiêu chí.
     - *Bước 2:* AI phân tích sinh gợi ý tổng quan (High-level summary, chủ đề, điểm nhấn từng ngày).
     - *Bước 3:* Nhận trao đổi/phản hồi điều chỉnh từ người dùng qua khung chat.
     - *Bước 4:* Sinh lịch trình chi tiết từng giờ bằng **Native Structured JSON Output** (ép chuẩn Pydantic Schema).
  4. Xây dựng API `POST /api/v1/ai/chat`: Chatbot tư vấn, tự động trả về `place_card` (tọa độ, tên điểm) để render Mini-map card trong chat (Yêu cầu 3).
  5. Xây dựng cơ chế retry tự động và fallback template khi AI gặp sự cố nghẽn mạng/rate-limit.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Các endpoint `/api/v1/ai/suggest`, `/api/v1/ai/generate`, `/api/v1/ai/chat` chạy ổn định.
  - [x] 100% lịch trình chi tiết trả về đúng cấu trúc JSON Schema, phân bổ giờ giấc khoa học, không bị hallucination sai địa lý TP.HCM.
  - [x] Tính năng Mini-map card trả về đúng tọa độ của địa điểm được nhắc đến.

---

#### 👤 Thành viên 5: Backend Developer — Algorithm & Smart Logistics
- **Họ và tên người phụ trách:** Diệp Bảo Danh
- **Mã số sinh viên (MSSV):** `
- **Thư mục & File phụ trách:**
  - `server/app/utils/transit_calculator.py`
  - `server/app/services/contingency_service.py`
  - `server/app/schemas/trip.py` (Swap schemas)
  - `server/app/api/v1/endpoints/trips.py` (Swap logic)
- **Nhiệm vụ cần làm chi tiết:**
  1. Triển khai công thức Haversine tính toán khoảng cách đại vòng chính xác giữa 2 tọa độ GPS.
  2. Xây dựng hàm ước lượng thời gian di chuyển theo loại phương tiện (đi bộ, xe máy, taxi/ô tô) phù hợp với thực tế giao thông TP.HCM.
  3. **Hiện thực Tính năng Đổi địa điểm — Swap Place (Yêu cầu 2):**
     - Thuật toán tìm 2-3 địa điểm thay thế tương đương (cùng thể loại, cùng quận hoặc bán kính lân cận < 2 km).
     - Endpoint `POST /api/v1/trips/{id}/swap-suggestions`: Trả về danh sách địa điểm đề xuất.
     - Endpoint `POST /api/v1/trips/{id}/swap`: Cập nhật địa điểm mới và tự động tính lại thời gian di chuyển chặng đó.
  4. **Hiện thực Hệ thống Kịch bản Dự phòng — Contingency Planning (Yêu cầu 4):**
     - *Trời mưa:* Tự động quét các điểm ngoài trời (`outdoor`) chuyển sang điểm trong nhà (`indoor`).
     - *Giờ cao điểm (17h - 19h):* Tự động gom cụm các địa điểm gần nhau, hạn chế tối đa di chuyển xuyên các trục đường kẹt xe.
     - *Điểm đóng cửa hoặc Vượt ngân sách:* Tự động đề xuất điểm thay thế tương đương giá rẻ hoặc miễn phí.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Thuật toán tính cự ly và thời gian di chuyển có độ chính xác cao (sai số < 10% so với Google Maps).
  - [x] Tính năng Swap gợi ý chính xác 2-3 điểm tương đương trong thời gian < 300ms.
  - [x] Kịch bản dự phòng thời tiết mưa và né kẹt xe 17h-19h vận hành thông minh, tự động điều chỉnh lịch trình hợp lý.

---

#### 👤 Thành viên 6: Backend Developer — Integrations & Trip Services
- **Họ và tên người phụ trách:** `Đàng Minh Hạo
- **Mã số sinh viên (MSSV):** `
- **Thư mục & File phụ trách:**
  - `server/app/services/calendar_service.py`
  - `server/app/api/v1/endpoints/calendar.py`
  - `server/app/api/v1/endpoints/trips.py`
  - `server/app/schemas/calendar.py`
- **Nhiệm vụ cần làm chi tiết:**
  1. Xây dựng bộ API quản lý hành trình (My Trips - Yêu cầu 5): `GET /api/v1/trips`, `GET /api/v1/trips/{id}`, `DELETE /api/v1/trips/{id}`, cập nhật trạng thái chuyến đi.
  2. **Hiện thực Chia sẻ Liên kết Công khai — Read-only Share Link (Yêu cầu 5):**
     - Endpoint `POST /api/v1/trips/{id}/share`: Sinh mã token ngẫu nhiên bảo mật (`uuid4`).
     - Endpoint `GET /api/v1/trips/public/{share_token}`: Cho phép người ngoài xem toàn bộ lịch trình chỉ đọc (Read-only) không cần đăng nhập và không có quyền sửa/xóa.
     - Hỗ trợ chủ sở hữu thu hồi (revoke) liên kết chia sẻ bất kỳ lúc nào.
  3. **Hiện thực Đánh giá Chất lượng Lịch trình (Yêu cầu 5):** Endpoint `POST /api/v1/trips/{id}/rating` tiếp nhận đánh giá 1-5 sao và nhận xét của người dùng.
  4. **Hiện thực Tính năng Đột phá — Đồng bộ Google Calendar (Yêu cầu 6):**
     - *Phương thức 1:* Sinh đường dẫn tạo sự kiện nhanh (Google Calendar Web Template Link).
     - *Phương thức 2:* Tích hợp Google Calendar API (OAuth2), tự động tạo hàng loạt Event cho từng hoạt động theo đúng ngày giờ, kèm cấu hình thông báo nhắc nhở trước **đúng 30 phút**.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Bộ API My Trips hoạt động chuẩn xác, truy vấn nhanh.
  - [x] Cơ chế Share Link an toàn, chặn hoàn toàn các hành vi chỉnh sửa trái phép từ người xem bên ngoài.
  - [x] Endpoint đánh giá sao lưu trữ thành công dữ liệu vào bảng `trip_ratings`.
  - [x] Đồng bộ thành công toàn bộ sự kiện lịch trình sang Google Calendar thực tế kèm thông báo nhắc trước 30 phút.

---

#### 👤 Thành viên 7: QA, DevOps & System Architect
- **Họ và tên người phụ trách:** `Đoàn Hải Đăng
- **Mã số sinh viên (MSSV):** `
- **Thư mục & File phụ trách:**
  - `docker-compose.yml`, `Dockerfile`
  - `server/tests/` (Toàn bộ kiểm thử tự động)
  - `docs/openapi.yaml`, `docs/13-demo-qa.md`, `docs/14-checklist.md`
  - `run_all.bat`, `run_backend.bat`, `run_frontend.bat`
- **Nhiệm vụ cần làm chi tiết:**
  1. Đóng gói toàn bộ hệ thống bằng Docker & Docker Compose: Cấu hình container FastAPI, container PostgreSQL 16 và mạng nội bộ giữa các container.
  2. Xây dựng các script khởi chạy 1-click tiện lợi trên môi trường Windows (`run_all.bat`, `run_backend.bat`, `run_frontend.bat`).
  3. **Xây dựng Bộ Kiểm thử Tự động Toàn diện (`server/tests/` qua `pytest` và `httpx`):**
     - Viết Unit Tests cho các hàm thuật toán: `transit_calculator.py`, băm mật khẩu, mã hóa JWT token.
     - Viết Integration Tests cho toàn bộ API Endpoints: Auth (đăng ký/đăng nhập đúng và sai), chặn truy cập không có token (Yêu cầu 1), CRUD Trips, Swap địa điểm, Google Calendar link.
     - Triển khai kỹ thuật Mocking cho Gemini API và Google OAuth để test chạy độc lập, tốc độ cao và không tốn chi phí gọi API thật.
  4. Duy trì và chuẩn hóa file đặc tả kỹ thuật tiêu chuẩn `docs/openapi.yaml` (OpenAPI 3.0).
  5. **Xây dựng Kịch bản Live Demo & Bộ câu hỏi bảo vệ đồ án (`docs/13-demo-qa.md`):**
     - Soạn kịch bản phân vai 7 thành viên trình diễn 5 luồng tính năng trực tiếp trước giảng viên.
     - Chuẩn bị sẵn bộ câu hỏi - trả lời phản biện chuyên sâu về kiến trúc, bảo mật và AI.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Hệ thống khởi động trọn vẹn chỉ với 1 câu lệnh (`docker-compose up` hoặc `run_all.bat`).
  - [x] Bộ test suite `pytest` đạt độ bao phủ (coverage) > 80%, tất cả test cases đều PASS (xanh lá).
  - [x] File OpenAPI 3.0 hợp lệ 100%, import được vào Swagger UI / Postman.
  - [x] Kịch bản demo và tài liệu phản biện sẵn sàng 100% cho buổi bảo vệ đồ án trước giảng viên.

---

## 📚 Danh Mục Tài Liệu Kỹ Thuật (Trong thư mục `docs/`)

Toàn bộ 31 tài liệu kỹ thuật, kiến trúc và đặc tả chi tiết của dự án được lưu trữ tập trung tại thư mục `docs/`:

### 1. Kế Hoạch Tổng Thể & Đặc Tả Cốt Lõi
| Tên File | Vai Trò & Nội Dung Chi Tiết |
|---|---|
| [**KE_HOACH_TONG_THE_DU_AN.md**](docs/KE_HOACH_TONG_THE_DU_AN.md) | **Hồ sơ tổng thể Master (Zero-code):** Bản kế hoạch toàn diện từ kiến trúc, 7 yêu cầu mới, phân tích WBS 7 người đến kịch bản demo bảo vệ. |
| [**yeu-cau-moi.md**](docs/yeu-cau-moi.md) | Đặc tả chi tiết 7 yêu cầu mới của giảng viên, phân tích kịch bản nghiệp vụ và tiêu chí nghiệm thu. |
| [**user-flow.md**](docs/user-flow.md) | Sơ đồ luồng trải nghiệm người dùng tổng thể (Mermaid Flowchart) từ Landing Page đến Lên lịch và Đồng bộ Calendar. |
| [**ke-hoach-thuc-hien.md**](docs/ke-hoach-thuc-hien.md) | Kế hoạch phân rã công việc WBS theo các Sprint, tiến độ bàn giao và chuẩn nghiệm thu từng tính năng (Definition of Done). |
| [**thay-doi-so-voi-ke-hoach-cu.md**](docs/thay-doi-so-voi-ke-hoach-cu.md) | Bảng so sánh đối chiếu những điểm khác biệt giữa tài liệu cũ và 7 yêu cầu mới của giảng viên. |
| [**kien-truc-api-db.md**](docs/kien-truc-api-db.md) | Thiết kế kiến trúc kỹ thuật hệ thống, sơ đồ quan hệ cơ sở dữ liệu (ERD) và danh mục các RESTful API. |
| [**openapi.yaml**](docs/openapi.yaml) | Bản đặc tả kỹ thuật tiêu chuẩn OpenAPI 3.0 đầy đủ cho toàn bộ hệ thống API, dùng để import vào Swagger UI hoặc Postman. |

### 2. Bộ Hồ Sơ Đặc Tả Đánh Số (01 — 15)
| Nhóm Hồ Sơ | Các File Thành Phần | Nội Dung Trọng Tâm |
|---|---|---|
| **Tổng Quan & Phạm Vi** | [01-tong-quan.md](docs/01-tong-quan.md), [02-scope.md](docs/02-scope.md) | Bối cảnh du lịch TP.HCM, mục tiêu đồ án, phạm vi In-scope & Out-of-scope |
| **Kiến Trúc & AI Flow** | [03-kien-truc-api-db.md](docs/03-kien-truc-api-db.md), [04-prompt-ai-flow.md](docs/04-prompt-ai-flow.md) | Kiến trúc Client-Server FastAPI, System Instruction & Luồng 4 bước sinh Structured JSON |
| **Kỹ Thuật Vận Hành** | [05-timeline.md](docs/05-timeline.md), [06-error-handling.md](docs/06-error-handling.md), [07-security.md](docs/07-security.md) | Tiến độ triển khai, xử lý lỗi & fallback, cơ chế bảo mật JWT & phân quyền |
| **Kiểm Thử & Đóng Gói** | [08-testing.md](docs/08-testing.md), [09-deploy.md](docs/09-deploy.md), [11-risks.md](docs/11-risks.md) | Kế hoạch kiểm thử Pytest, triển khai Docker & phân tích ma trận rủi ro |
| **Hệ Thống Thiết Kế UI** | [10a-ui-design-system.md](docs/10a-ui-design-system.md), [10b-ui-wireframes.md](docs/10b-ui-wireframes.md), [10c-ui-chat-motion-settings.md](docs/10c-ui-chat-motion-settings.md) | Design System, Wireframes 8 màn hình, hiệu ứng động và Mini-map card |
| **Hồ Sơ Thiết Kế Module** | [12-1](docs/12-1-schema-sql.md) đến [12-8](docs/12-8-adaptive-layer.md) | Đặc tả DDL CSDL, Haversine Transit, Places Service, Trip Service, Seed Data, Identity, Auth & Adaptive Layer |
| **Bảo Vệ Đồ Án & Nghiệm Thu** | [13-demo-qa.md](docs/13-demo-qa.md), [14-checklist.md](docs/14-checklist.md), [15-roadmap.md](docs/15-roadmap.md) | Kịch bản Live Demo 5 phút, bộ câu hỏi phản biện, checklist bàn giao & định hướng phát triển |

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
