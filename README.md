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

## 👥 Bảng Phân Công Nhiệm Vụ Thành Viên (Mô Hình Full-Stack Theo Module)

> [!IMPORTANT]
> **Quy tắc phân công nhân sự đồ án (Mô hình Vertical Slicing / Full-Stack Feature Teams):**
> - **Mỗi thành viên làm chủ trọn vẹn 01 Module chuyên biệt (End-to-End Ownership):** Tự đảm nhiệm từ Cơ sở dữ liệu ➔ Logic API Backend ➔ Giao diện Frontend tương ứng cho tính năng của mình. Đảm bảo cả 7 thành viên đều có sản phẩm Full-Stack độc lập, rõ ràng để báo cáo và bảo vệ trước hội đồng giảng viên.
> - **Thành viên 1 (Phạm Gia Hưng):** Đảm nhiệm Module **Cổng Khám Phá, Lịch Trình Mẫu & Chia Sẻ Công Khai**, đồng thời giữ vai trò **UI/UX & Frontend Lead** chịu trách nhiệm thiết lập Design System, khung Layout dùng chung (Navbar, Footer) và các component cơ bản (`Button`, `Input`, `Modal`, `Toast`) để 6 thành viên còn lại sử dụng, đảm bảo toàn bộ website đồng nhất 100% về thẩm mỹ.
> - **Phân chia rạch ròi theo từng file Page & Component:** Mỗi thành viên chỉ code trên các file Page/Component thuộc module của mình, loại bỏ hoàn toàn nguy cơ xung đột mã nguồn (Merge Conflicts) khi làm việc nhóm qua Git.

### 📊 Bảng Ma Trận Phân Công Tổng Hợp (Full-Stack WBS Matrix)

| STT | Họ và tên | Module Full-Stack phụ trách | Công việc Backend đảm nhiệm | Giao diện Frontend tự xây dựng | Chuẩn đầu ra (Deliverables) |
| :---: | :---: | :---|:---|:---|---|
| **1** | **Phạm Gia Hưng** | **Cổng Khám Phá, Lịch Trình Mẫu & Chia Sẻ Hub**<br>*(UI/UX & Frontend Lead)* | • API Lịch trình mẫu TP.HCM: `GET /api/v1/trips/featured`.<br>• API Đọc lịch trình chia sẻ: `GET /api/v1/trips/public/{token}`.<br>• API Sao chép chuyến đi: `POST /api/v1/trips/public/{token}/clone`. | • `components/layout/` (Navbar, Footer, UserMenu).<br>• `components/common/` (Button, Input, Modal, Toast...).<br>• `pages/LandingPage.jsx` (Hero, Tour mẫu TP.HCM, CTA đăng nhập).<br>• `pages/SharedTripPage.jsx` (Trang chỉ xem + nút Clone & In PDF). | • Khung Layout & Thư viện component dùng chung chuẩn 100%.<br>• Trang Landing kích thích khách đăng nhập bằng tour mẫu (YC 1).<br>• Trang Shared Trip chỉ đọc bảo mật, hỗ trợ clone và in PDF (YC 5). |
| **2** | **Đỗ Nguyễn An Khang** | **Xác thực, Bảo mật & Hồ sơ Người dùng**<br>*(Auth, Security & User Profile)* | • Cấu hình hệ thống BaseSettings, CORS, Exception Handlers.<br>• Băm mật khẩu bcrypt, cấp phát & xác minh JWT Token.<br>• Dependency `get_current_user` bắt buộc đăng nhập (Yêu cầu 1).<br>• API lưu sở thích du lịch người dùng cũ (Yêu cầu 7). | • `pages/LoginPage.jsx` & `RegisterPage.jsx`.<br>• `pages/SettingsPage.jsx` (Xem/sửa thông tin & sở thích).<br>• `context/AuthContext.jsx` (Quản lý phiên đăng nhập/đăng xuất).<br>• `services/authService.js` (Gọi API Auth kèm JWT header). | • Luồng Đăng ký, Đăng nhập, Đăng xuất hoạt động trơn tru.<br>• Chặn 100% khách chưa đăng nhập truy cập trang bảo vệ.<br>• Mật khẩu băm an toàn, bảo mật tuyệt đối tài khoản. |
| **3** | **Ngô Tấn Đạt** | **Địa Điểm TP.HCM & Bản Đồ Tương Tác**<br>*(Places Database & Interactive Map)* | • Lược đồ CSDL 6 bảng quan hệ (`schema.sql`) & Session pool.<br>• Số hóa 100+ địa điểm TP.HCM (GPS, giờ mở cửa, indoor/outdoor).<br>• Places API tìm kiếm, lọc theo quận/thể loại & fallback cache. | • `components/map/MapView.jsx` (Bản đồ Mapbox GL / Google Maps).<br>• `components/map/PlaceMarker.jsx` (Marker ghim đánh số 1, 2, 3...).<br>• `components/map/RouteLayer.jsx` (Vẽ đường Polyline lộ trình).<br>• `components/map/MiniMapCard.jsx` (Card mini trong chat - YC 3). | • CSDL quan hệ chuẩn hóa 3NF, tọa độ GPS thực tế 100%.<br>• Bản đồ tương tác mượt mà, ghim đúng tọa độ và vẽ lộ trình.<br>• Thẻ Mini-map card hiển thị chuẩn xác trong khung chat. |
| **4** | **Lê Hữu Lam** | **AI Core & Khung Chat Lên Kế Hoạch**<br>*(Gemini LLM & Planner Studio)* | • Tích hợp Google Gemini API (`gemini-1.5-flash`/`pro`).<br>• System Prompt am hiểu văn hóa TP.HCM, loại bỏ persona thừa.<br>• Luồng 4 bước sinh Structured JSON chi tiết từng giờ (YC 2).<br>• API Chatbot tư vấn, trả về dữ liệu cho thẻ Mini-map (YC 3). | • `pages/PlannerPage.jsx` (Form 8 tiêu chí + Lời chào người cũ).<br>• `components/chat/MessageList.jsx` & `ChatInput.jsx`.<br>• `components/chat/QuickSuggestions.jsx` (Gợi ý nhanh).<br>• `context/TripContext.jsx` (Quản lý trạng thái đàm thoại AI). | • 100% lịch trình chi tiết trả về đúng chuẩn JSON Schema.<br>• Form 8 tiêu chí hoạt động mượt mà, tự điền trước khi quay lại.<br>• Khung chat tương tác thời gian thực, không bị ảo giác địa lý. |
| **5** | **Diệp Bảo Danh** | **Lịch Trình Chi Tiết, Đổi Điểm & Kịch Bản Dự Phòng**<br>*(Itinerary, Swap Place & Contingency)* | • Thuật toán Haversine tính khoảng cách & thời gian di chuyển.<br>• Thuật toán tìm 2-3 điểm thay thế tương đương (Swap Place - YC 2).<br>• Xử lý rủi ro dự phòng: Trời mưa, Né kẹt xe 17h-19h (YC 4).<br>• Endpoint swap địa điểm và cập nhật lại mốc thời gian. | • `components/trip/DayTimeline.jsx` (Trục thời gian từng ngày).<br>• `components/trip/ActivityCard.jsx` (Thẻ hoạt động chi tiết).<br>• `components/trip/SwapModal.jsx` (Modal chọn 2-3 điểm đổi).<br>• Bộ nút bấm kích hoạt kịch bản dự phòng (Mưa / Kẹt xe 17h-19h). | • Thuật toán Haversine sai số < 10% so với Google Maps.<br>• Đổi địa điểm (Swap Place) gợi ý chính xác trong < 300ms.<br>• Timeline hiển thị giờ giấc khoa học, đồng bộ với bản đồ.<br>• Kịch bản thời tiết mưa và giờ cao điểm tự điều chỉnh hợp lý. |
| **6** | **Đàng Minh Hạo** | **Quản Lý Chuyến Đi, Đánh Giá AI & Google Calendar**<br>*(Trips Portfolio, Rating & Calendar Sync)* | • API My Trips (CRUD danh sách và chi tiết các chuyến đi).<br>• Sinh token chia sẻ an toàn `POST /api/v1/trips/{id}/share`.<br>• Endpoint lưu đánh giá 1-5 sao kèm nhận xét (Yêu cầu 5).<br>• Tích hợp Google Calendar OAuth2 API kèm báo thức 30p (YC 6). | • `pages/MyTripsPage.jsx` (Danh sách chuyến đi dạng Grid Card).<br>• `pages/TripDetailPage.jsx` (Xem lại chi tiết chuyến đi).<br>• Modal Đồng bộ Calendar (hướng dẫn & mở Google Calendar).<br>• Modal Đánh giá sao (RatingModal 1-5 sao + gửi nhận xét). | • Quản lý My Trips hoàn chỉnh, tìm kiếm và xóa chuyến đi dễ dàng.<br>• Nút tạo link chia sẻ hoạt động chính xác, tự copy vào clipboard.<br>• Đẩy thành công lịch trình lên Google Calendar kèm báo thức 30p.<br>• Đánh giá sao lưu trữ thành công vào bảng `trip_ratings`. |
| **7** | **Đoàn Hải Đăng** | **DevOps, Docker, Kiểm Thử Tự Động & Tích Hợp**<br>*(DevOps, Automated Testing & QA)* | • Đóng gói Docker Compose (FastAPI + PostgreSQL).<br>• Viết các script khởi chạy 1-click trên Windows (`run_all.bat`).<br>• Bộ test suite tự động toàn diện bằng `pytest` (> 80% coverage).<br>• Mocking Gemini API và Google OAuth để test độc lập, nhanh chóng. | • Kiểm thử End-to-End toàn bộ giao diện 8 màn hình.<br>• Rà soát và tối ưu Responsive Mobile, hiệu năng tải trang.<br>• Chuẩn hóa tài liệu kỹ thuật OpenAPI 3.0 (`docs/openapi.yaml`).<br>• Xây dựng Kịch bản Live Demo 5 phút để nhóm báo cáo đồ án. | • Hệ thống khởi động trọn vẹn chỉ với 1 câu lệnh (`run_all.bat`).<br>• Toàn bộ test suite `pytest` đều PASS (xanh lá 100%).<br>• Giao diện web chạy trơn tru, không có lỗi console.<br>• Kịch bản demo và tài liệu phản biện sẵn sàng 100% cho buổi bảo vệ. |

---

### 📝 Bản Đặc Tả Nhiệm Vụ Chi Tiết Từng Thành Viên (Detailed Full-Stack WBS & DoD)

#### 👤 Thành viên 1: Phạm Gia Hưng — Full-Stack: Cổng Khám Phá, Lịch Trình Mẫu & Chia Sẻ Công Khai (Public Portal, Featured Trips & Shared Hub)
- **Họ và tên người phụ trách:** **Phạm Gia Hưng**
- **Mã số sinh viên (MSSV):** `....................................................`
- **Vai trò chuyên môn:** UI/UX Lead & Full-Stack Portal Architect
- **Thư mục & File phụ trách:**
  - *Backend Services & API:* `server/app/api/v1/endpoints/trips.py` (các endpoint `featured`, `public/{token}`, `clone`), `server/app/schemas/trip.py`
  - *Cấu hình & Style chung:* `client/index.html`, `client/vite.config.js`, `client/tailwind.config.js`, `client/postcss.config.js`, `client/src/index.css`
  - *Bộ UI Component dùng chung (`client/src/components/common/`):* `Button.jsx`, `Input.jsx`, `Modal.jsx`, `Toast.jsx`, `LoadingSpinner.jsx`
  - *Khung giao diện cố định (`client/src/components/layout/`):* `Navbar.jsx`, `Sidebar.jsx`, `Footer.jsx`, `UserMenu.jsx`
  - *Routing & Điểm khởi chạy:* `client/src/main.jsx`, `client/src/App.jsx`
  - *Giao diện màn hình chính:* `client/src/pages/LandingPage.jsx`, `client/src/pages/SharedTripPage.jsx`
  - *Tài nguyên tĩnh:* `client/src/assets/` (Logo, icons, hình ảnh TP.HCM)
- **Nhiệm vụ cần làm chi tiết:**
  1. *Backend - API Lịch trình mẫu TP.HCM:* Xây dựng endpoint `GET /api/v1/trips/featured` trả về danh mục các lịch trình mẫu TP.HCM xuất sắc nhất (1 ngày khám phá ẩm thực Chợ Lớn Quận 5, 2 ngày di sản văn hóa Sài Gòn xưa, 3 ngày check-in hiện đại Thủ Đức - Quận 1) với đầy đủ ảnh bìa, điểm nhấn và dự toán chi phí.
  2. *Backend - API Đọc lịch trình chia sẻ công khai (Yêu cầu 5):* Xây dựng endpoint `GET /api/v1/trips/public/{share_token}` cho phép người xem bên ngoài đọc dữ liệu chuyến đi ở chế độ chỉ xem (Read-only), lọc bỏ các thông tin nhạy cảm của chủ sở hữu.
  3. *Backend - API Nhân bản chuyến đi (Clone Trip):* Xây dựng endpoint `POST /api/v1/trips/public/{share_token}/clone` cho phép người dùng sau khi đăng nhập có thể 1-click nhân bản toàn bộ lịch trình mẫu/được chia sẻ vào danh mục chuyến đi của mình để tùy chỉnh tiếp.
  4. *Frontend - Thiết lập Design System & Component chung:* Chuẩn hóa bảng màu Tailwind, typography; xây dựng bộ UI Component dùng chung trong `components/common/` (`Button`, `Input`, `Modal`, `Toast`, `LoadingSpinner`) để toàn bộ 6 thành viên còn lại sử dụng.
  5. *Frontend - Khung giao diện Global Layout:* Xây dựng `Navbar.jsx` cố định có menu điều hướng và trạng thái tài khoản; `Footer.jsx` chuyên nghiệp; `UserMenu.jsx` dropdown.
  6. *Frontend - Màn hình `LandingPage.jsx` (Thực thi Yêu cầu 1):* Dựng Hero Section ấn tượng giới thiệu hệ thống, khối Carousel các lịch trình mẫu TP.HCM tương tác (cho phép khách xem trước lịch trình mẫu để kích thích đăng nhập), khối trình diễn 7 tính năng đột phá, nút CTA kêu gọi đăng nhập.
  7. *Frontend - Màn hình `SharedTripPage.jsx` (Thực thi Yêu cầu 5):* Dựng giao diện xem lịch trình chỉ đọc khi truy cập link `/s/:shareToken`, hiển thị timeline, nút "Sao chép vào chuyến đi của tôi" và nút "In lịch trình / Xuất file PDF".
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Backend API `/api/v1/trips/featured` và `/api/v1/trips/public/{share_token}` chạy ổn định, phản hồi < 100ms.
  - [x] Gói thư viện component chung (`Button`, `Input`, `Modal`, `Toast`) chạy mượt mà, đầy đủ props và biến thể.
  - [x] Trang `LandingPage.jsx` ấn tượng, tải nhanh, hiển thị tour mẫu trực quan kích thích khách đăng ký tài khoản (Yêu cầu 1).
  - [x] Trang `SharedTripPage.jsx` hiển thị đẹp mắt, bảo mật, nút sao chép chuyến đi và in ấn hoạt động chuẩn xác.
  - [x] Lệnh `npm run build` tạo bundle production thành công 100% không cảnh báo.

---

#### 👤 Thành viên 2: Đỗ Nguyễn An Khang — Full-Stack: Xác thực, Bảo mật & Hồ sơ Người dùng (Auth, Security & User Profile)
- **Họ và tên người phụ trách:** **Đỗ Nguyễn An Khang**
- **Mã số sinh viên (MSSV):** `....................................................`
- **Vai trò chuyên môn:** Full-Stack Auth & Security Developer
- **Thư mục & File phụ trách:**
  - *Backend Core & Auth API:* `server/app/core/config.py`, `server/app/core/security.py`, `server/app/core/dependencies.py`, `server/app/api/v1/endpoints/auth.py`, `server/app/schemas/user.py`, `server/.env.example`
  - *Frontend Pages & Context:* `client/src/pages/LoginPage.jsx`, `client/src/pages/RegisterPage.jsx`, `client/src/pages/SettingsPage.jsx`, `client/src/context/AuthContext.jsx`, `client/src/hooks/useAuth.js`, `client/src/services/authService.js`
- **Nhiệm vụ cần làm chi tiết:**
  1. *Backend - Cấu hình & Bảo mật:* Thiết lập `config.py` đọc cấu hình môi trường từ `.env`; cấu hình CORS Middleware; viết thuật toán băm mật khẩu bảo mật một chiều bằng `bcrypt`; hiện thực hàm ký và giải mã JWT Access Token (hạn 24h) và Refresh Token an toàn.
  2. *Backend - Thực thi Yêu cầu 1:* Viết FastAPI dependency `get_current_user` trích xuất token từ header `Authorization: Bearer <token>`, bắt buộc đăng nhập đối với mọi endpoint tài nguyên cá nhân, trả về HTTP 401 Unauthorized nếu thiếu/sai token.
  3. *Backend - API Xác thực:* Xây dựng các endpoint `POST /api/v1/auth/register` (đăng ký kèm kiểm tra trùng lặp email/username), `POST /api/v1/auth/login` (xác thực và trả về JWT Token), `GET /api/v1/auth/me` (lấy thông tin user hiện tại).
  4. *Backend - Thực thi Yêu cầu 7:* Xây dựng endpoint `GET /api/v1/auth/preferences` & `PUT /api/v1/auth/preferences` lưu trữ ngân sách, phong cách du lịch quen thuộc để phục vụ tính năng điền trước (pre-fill) form.
  5. *Frontend - Auth State & Service:* Xây dựng `authService.js` (gọi API auth qua Axios kèm JWT interceptor); xây dựng `AuthContext.jsx` và custom hook `useAuth.js` quản lý phiên đăng nhập toàn cục, tự động lưu token vào localStorage và bảo vệ các Private Routes.
  6. *Frontend - Giao diện Đăng nhập & Đăng ký:* Dựng màn hình `LoginPage.jsx` và `RegisterPage.jsx` với form nhập liệu mượt mà, validate regex email/password, nút hiển thị/ẩn mật khẩu, nút đăng nhập nhanh bằng tài khoản test (1-click test login).
  7. *Frontend - Giao diện Cài đặt Tài khoản:* Dựng trang `SettingsPage.jsx` cho phép xem thông tin cá nhân, cập nhật mật khẩu và xem/chỉnh sửa sở thích du lịch đã lưu trong bộ nhớ hệ thống.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] Luồng đăng ký, đăng nhập, đăng xuất hoạt động trơn tru từ Frontend đến Backend.
  - [x] Khách chưa đăng nhập bị chặn 100% khi cố truy cập các trang bảo vệ (`/planner`, `/trips`).
  - [x] Mật khẩu người dùng được băm an toàn trong CSDL, không lộ mật khẩu dạng plain text.
  - [x] Màn hình Settings cập nhật thành công sở thích du lịch và đồng bộ ngay với Backend.

---

#### 👤 Thành viên 3: Ngô Tấn Đạt — Full-Stack: Địa Điểm TP.HCM & Bản Đồ Tương Tác (Places Database & Interactive Map)
- **Họ và tên người phụ trách:** **Ngô Tấn Đạt**
- **Mã số sinh viên (MSSV):** `....................................................`
- **Vai trò chuyên môn:** Full-Stack Database & GIS Map Developer
- **Thư mục & File phụ trách:**
  - *Backend Database & Places Service:* `server/app/db/schema.sql`, `server/app/db/session.py`, `server/app/db/hcmc_data.py`, `server/app/services/places_service.py`, `server/app/api/v1/endpoints/places.py`
  - *Frontend Map Components & Hooks:* `client/src/components/map/MapView.jsx`, `client/src/components/map/PlaceMarker.jsx`, `client/src/components/map/RouteLayer.jsx`, `client/src/components/map/MiniMapCard.jsx`, `client/src/hooks/useMap.js`
- **Nhiệm vụ cần làm chi tiết:**
  1. *Backend - Mô hình hóa CSDL:* Thiết kế bảng `users`, `user_preferences`, `trips`, `trip_days`, `trip_activities`, `trip_ratings` trong `schema.sql` với đầy đủ Foreign Keys, Constraints, Indexes; cấu hình kết nối SQLAlchemy Session Pool trong `session.py`.
  2. *Backend - Dữ liệu thực tế TP.HCM:* Thu thập, chuẩn hóa và số hóa bộ dữ liệu hạt nhân 100+ địa điểm du lịch, ẩm thực, văn hóa nổi tiếng tại TP.HCM (Quận 1, 3, 5, Thủ Đức, Bình Thạnh...); định dạng siêu dữ liệu: Tên chuẩn, Địa chỉ, Tọa độ GPS (lat, lng), Giờ mở cửa, Giá vé, Phân loại `indoor` vs `outdoor` (*phục vụ kịch bản trời mưa*), Thể loại.
  3. *Backend - Places API:* Xây dựng `places_service.py` và API `GET /api/v1/places/search`, `GET /api/v1/places/{id}`; tích hợp Google Places API (New) lấy hình ảnh và rating thực tế kèm cơ chế fallback dữ liệu cục bộ khi mất mạng.
  4. *Frontend - Tích hợp Bản đồ Tương tác:* Xây dựng component `MapView.jsx` tích hợp Mapbox GL / Google Maps, tự động căn chỉnh tọa độ trung tâm TP.HCM, hỗ trợ phóng to/thu nhỏ, đổi kiểu bản đồ (đường phố/vệ tinh).
  5. *Frontend - Marker & Polyline Lộ trình:* Xây dựng `PlaceMarker.jsx` vẽ các điểm ghim đánh số thứ tự (1, 2, 3...) theo từng hoạt động trong ngày; xây dựng `RouteLayer.jsx` vẽ đường nối di chuyển (Polyline) trực quan giữa các địa điểm.
  6. *Frontend - Thẻ Bản Đồ Mini trong Chat (Yêu cầu 3):* Xây dựng `MiniMapCard.jsx` hiển thị trực tiếp bên trong bong bóng chat AI khi trả lời về một địa điểm cụ thể, cho phép người dùng xem nhanh ảnh, tọa độ và click để phóng to bản đồ lớn.
  7. *Frontend - Tương tác 2 chiều:* Viết hook `useMap.js` điều khiển camera bản đồ, bắt sự kiện click Marker trên bản đồ thì tự động cuộn đến thẻ hoạt động tương ứng trên Timeline.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] File `schema.sql` tạo bảng CSDL thành công 100% không lỗi cú pháp.
  - [x] CSDL chứa hơn 100 địa điểm TP.HCM thực tế, tọa độ GPS chuẩn xác trên bản đồ.
  - [x] Bản đồ tương tác mượt mà, ghim đúng vị trí, vẽ đường nối lộ trình không bị giật lag.
  - [x] Mini-map card hiển thị đẹp mắt trong khung chat khi AI nhắc tới địa điểm.

---

#### 👤 Thành viên 4: Lê Hữu Lam — Full-Stack: AI Core & Khung Chat Lên Kế Hoạch (Gemini LLM & Planner Studio)
- **Họ và tên người phụ trách:** **Lê Hữu Lam**
- **Mã số sinh viên (MSSV):** `....................................................`
- **Vai trò chuyên môn:** Full-Stack AI Engineer & Prompt Architect
- **Thư mục & File phụ trách:**
  - *Backend AI Engine:* `server/app/services/gemini_service.py`, `server/app/api/v1/endpoints/ai.py`, `server/app/schemas/ai.py`
  - *Frontend Chat & Planner Studio:* `client/src/pages/PlannerPage.jsx` (Form khảo sát 8 tiêu chí + Lời chào người cũ), `client/src/components/chat/MessageList.jsx`, `client/src/components/chat/ChatInput.jsx`, `client/src/components/chat/QuickSuggestions.jsx`, `client/src/context/TripContext.jsx` (quản lý state chat & form)
- **Nhiệm vụ cần làm chi tiết:**
  1. *Backend - Tích hợp Google Gemini API:* Kết nối thư viện `google-generativeai` với model `gemini-1.5-flash` / `gemini-1.5-pro`; thiết kế System Instruction chuyên sâu am hiểu địa lý, ẩm thực hẻm và nhịp sống TP.HCM; **loại bỏ triệt để persona/giọng điệu nhân vật** (Yêu cầu 7).
  2. *Backend - Luồng Tương tác 4 Bước (Yêu cầu 2):*
     - *Bước 1:* Tiếp nhận form 8 tiêu chí (ngày, quận, ngân sách, phong cách, số người, phương tiện, nhịp độ, ghi chú).
     - *Bước 2:* API `POST /api/v1/ai/suggest` sinh gợi ý tổng quan (High-level summary, chủ đề, điểm nhấn từng ngày).
     - *Bước 3:* Nhận phản hồi/trao đổi điều chỉnh từ người dùng qua khung chat.
     - *Bước 4:* API `POST /api/v1/ai/generate` sinh lịch trình chi tiết từng giờ bằng **Native Structured JSON Output** (ép chuẩn Pydantic Schema).
  3. *Backend - Chatbot Tư Vấn Du Lịch:* Xây dựng API `POST /api/v1/ai/chat` tiếp nhận tin nhắn trao đổi, tự động phát hiện địa điểm để trả về trường `place_card` chứa tọa độ phục vụ render Mini-map card (Yêu cầu 3).
  4. *Frontend - Form Khảo sát 8 Tiêu chí (Yêu cầu 2):* Xây dựng giao diện Form thu thập đầy đủ 8 tiêu chí du lịch TP.HCM với UI trực quan (chọn quận, chọn thanh kéo ngân sách, chọn badge phong cách, chọn nhịp độ thư thả/vừa phải/dày đặc).
  5. *Frontend - Lời Chào Người Cũ & Điền Trước Form (Yêu cầu 7):* Nhận diện người dùng quay lại, tự động điền sẵn (pre-fill) form từ sở thích đã lưu của các chuyến đi trước, cho phép điều chỉnh nhanh với 1 click.
  6. *Frontend - Khung Chat Tương Tác Thời Gian Thực:* Xây dựng `MessageList.jsx` hiển thị luồng trao đổi giữa du khách và AI, hiệu ứng đang nhập văn bản (Typing Indicator), component `ChatInput.jsx` kèm các gợi ý nhanh `QuickSuggestions.jsx` (*"Tìm quán ăn khuya Quận 1"*, *"Thêm điểm check-in sống ảo"*).
  7. *Frontend - Quản lý Luồng 4 bước:* Xây dựng các nút chuyển trạng thái luồng (Nút "Xem gợi ý ý tưởng", Nút "Đồng ý & Tạo lịch trình chi tiết") chuyển giao mượt mà sang màn hình hiển thị Timeline.
- **Tiêu chuẩn nghiệm thu (Definition of Done - DoD):**
  - [x] AI sinh phản hồi chuẩn Native Structured JSON 100%, không bị ảo giác sai địa lý TP.HCM.
  - [x] Luồng tương tác 4 bước hoạt động mượt mà đúng quy chuẩn giảng viên yêu cầu.
  - [x] Giao diện Form 8 tiêu chí đẹp mắt, tự động điền trước dữ liệu khi người dùng cũ quay lại.
  - [x] Khung chat hiển thị nhanh, trực quan, hỗ trợ hiển thị thẻ mini-map bên trong tin nhắn.

---

#### 👤 Thành viên 5: Diệp Bảo Danh — Full-Stack: Lịch Trình Chi Tiết, Đổi Điểm & Kịch Bản Dự Phòng (Itinerary, Swap Place & Contingency)
- **Họ và tên người phụ trách:** **Diệp Bảo Danh**
- **Mã số sinh viên (MSSV):** `....................................................`
- **Vai trò chuyên môn:** Full-Stack Logistics & Algorithm Developer
- **Thư mục & File phụ trách:**
  - *Backend Routing, Swap & Contingency:* `server/app/utils/transit_calculator.py`, `server/app/services/contingency_service.py`, `server/app/schemas/trip.py` (Swap schemas), `server/app/api/v1/endpoints/trips.py` (logic swap & contingency)
  - *Frontend Timeline & Swap Components:* `client/src/components/trip/DayTimeline.jsx`, `client/src/components/trip/ActivityCard.jsx`, `client/src/components/trip/SwapModal.jsx`, các nút bấm kích hoạt kịch bản dự phòng (Mưa, Kẹt xe 17h-19h)
- **Nhiệm vụ cần làm chi tiết:**
  1. *Backend - Thuật toán Haversine & Di chuyển đô thị:* Xây dựng `transit_calculator.py` tính khoảng cách đại vòng và ước lượng thời gian di chuyển theo loại phương tiện (đi bộ, xe máy, taxi) có tính hệ số ùn tắc giao thông TP.HCM.
  2. *Backend - Tính năng Đổi địa điểm — Swap Place (Yêu cầu 2):*
     - Viết thuật toán tìm kiếm 2-3 địa điểm thay thế tương đương (cùng thể loại, cùng quận hoặc bán kính lân cận < 2 km).
     - Endpoint `POST /api/v1/trips/{id}/swap-suggestions`: Trả về danh sách địa điểm đề xuất.
     - Endpoint `POST /api/v1/trips/{id}/swap`: Cập nhật địa điểm mới vào lịch trình và tự động tính lại mốc thời gian chặng kế tiếp.
  3. *Backend - Hệ thống Kịch bản Dự phòng — Contingency Planning (Yêu cầu 4):*
     - Viết `contingency_service.py` xử lý 4 kịch bản:
       - *Kịch bản Trời mưa:* Tự động quét các điểm ngoài trời (`outdoor`) và chuyển đổi sang điểm trong nhà (`indoor`: bảo tàng, TTTM, workshop).
       - *Kịch bản Giờ cao điểm (17h - 19h):* Tự động phát hiện di chuyển xuyên quận để gom cụm các địa điểm gần nhau, hạn chế tối đa kẹt xe.
       - *Kịch bản Điểm đóng cửa hoặc Vượt ngân sách:* Tự động đề xuất điểm thay thế tương đương giá rẻ hoặc miễn phí.
  4. *Frontend - Timeline Lịch trình Từng Ngày:* Xây dựng `DayTimeline.jsx` chia tab theo ngày (Day 1, Day 2...), hiển thị trục thời gian dọc đẹp mắt từ sáng đến tối.
  5. *Frontend - Thẻ Hoạt động Chi tiết:* Xây dựng `ActivityCard.jsx` hiển thị khung giờ, tên địa điểm, ảnh thumbnail, chi phí dự kiến, huy hiệu thể loại (ẩm thực/văn hóa), nhãn cảnh báo thời tiết và nút "Đổi địa điểm".
  6. *Frontend - Modal Đổi Địa Điểm (Swap Place Modal):* Dựng `SwapModal.jsx` mở ra khi click nút đổi điểm, hiển thị 2-3 lựa chọn thay thế với ảnh, khoảng cách và chi phí; khi người dùng chọn một điểm, giao diện tự động cập nhật lại Timeline tức thì.
  7. *Frontend - Bộ Nút Kích hoạt Kịch bản Dự phòng:* Thiết kế thanh điều khiển phương án dự phòng (Nút bấm *"Trời đang mưa 🌧️"*, *"Tránh giờ cao điểm 17h-19h 🚗"*), gửi yêu cầu lên Backend và hiển thị hiệu ứng chuyển đổi lịch trình linh hoạt.
- **Tiêu chuẩn nghiệm thu (DoD):**
  - [x] Thuật toán Haversine tính thời gian di chuyển chuẩn xác (sai số < 10% so với Google Maps).
  - [x] Tính năng Swap địa điểm gợi ý chính xác 2-3 phương án và cập nhật lại Timeline dưới 300ms.
  - [x] Giao diện DayTimeline hiển thị mốc giờ khoa học, rõ ràng, đồng bộ với bản đồ.
  - [x] Kịch bản Trời mưa và Né kẹt xe 17h-19h vận hành trơn tru cả ở giao diện và API.

---

#### 👤 Thành viên 6: Đàng Minh Hạo — Full-Stack: Quản Lý Chuyến Đi, Đánh Giá AI & Google Calendar (Trips Portfolio, Rating & Calendar Sync)
- **Họ và tên người phụ trách:** **Đàng Minh Hạo**
- **Mã số sinh viên (MSSV):** `....................................................`
- **Vai trò chuyên môn:** Full-Stack Integrations & Trip Services Developer
- **Thư mục & File phụ trách:**
  - *Backend Trips & Calendar API:* `server/app/services/calendar_service.py`, `server/app/api/v1/endpoints/calendar.py`, `server/app/api/v1/endpoints/trips.py` (CRUD trips, share trigger, rating), `server/app/schemas/calendar.py`
  - *Frontend Pages & Modals:* `client/src/pages/MyTripsPage.jsx`, `client/src/pages/TripDetailPage.jsx`, Modal Đồng bộ Calendar, Modal Đánh giá sao (`RatingModal.jsx`), `client/src/services/tripService.js`, `client/src/services/calendarService.js`
- **Nhiệm vụ cần làm chi tiết:**
  1. *Backend - Nghiệp vụ Quản lý Chuyến đi (My Trips - Yêu cầu 5):* Xây dựng các API `GET /api/v1/trips` (danh sách chuyến đi của user đang đăng nhập), `GET /api/v1/trips/{id}` (lấy toàn bộ chi tiết ngày/hoạt động), `DELETE /api/v1/trips/{id}` (xóa chuyến đi).
  2. *Backend - Sinh mã Token chia sẻ (Yêu cầu 5):* Endpoint `POST /api/v1/trips/{id}/share`: Sinh mã token ngẫu nhiên bảo mật (`uuid4`), quản lý trạng thái bật/tắt (thu hồi) liên kết chia sẻ.
  3. *Backend - Đánh giá Chất lượng Lịch trình (Yêu cầu 5):* Endpoint `POST /api/v1/trips/{id}/rating` nhận đánh giá 1-5 sao và nhận xét chi tiết, lưu trữ vào bảng `trip_ratings` phục vụ phản hồi chất lượng AI.
  4. *Backend - Tự động Đồng bộ Google Calendar (Yêu cầu 6):*
     - Xây dựng giải pháp 2 tầng:
       - *Tầng 1 (Tức thì):* Sinh đường dẫn tạo sự kiện nhanh (Google Calendar Web Template Link).
       - *Tầng 2 (API):* Tích hợp Google Calendar OAuth2 API, tự động tạo hàng loạt Event cho từng hoạt động theo đúng ngày giờ, cấu hình thông báo nhắc nhở trước **đúng 30 phút**.
  5. *Frontend - Màn hình My Trips:* Dựng `MyTripsPage.jsx` hiển thị danh sách chuyến đi đã tạo dạng lưới (Card Grid), tìm kiếm chuyến đi, bộ lọc theo ngày/ngân sách, nút xem chi tiết và nút xóa chuyến đi.
  6. *Frontend - Màn hình Chi tiết Chuyến đi:* Dựng `TripDetailPage.jsx` xem lại lịch trình đầy đủ; nút "Chia sẻ" tự động gọi API sinh token và sao chép link dạng `/s/:shareToken` vào clipboard của người dùng.
  7. *Frontend - Modal Calendar & Modal Đánh giá sao:* Xây dựng Modal "Đồng bộ Google Calendar" (hiển thị thông báo hướng dẫn và nút mở Calendar); dựng Modal Đánh giá sao (chọn 1-5 sao, nhập nhận xét và gửi feedback).
- **Tiêu chuẩn nghiệm thu (DoD):**
  - [x] Trang My Trips và Trip Detail hiển thị đầy đủ, tải nhanh dữ liệu chuyến đi.
  - [x] Nút tạo link chia sẻ hoạt động chính xác, tự động copy đường link `/s/:shareToken` vào clipboard.
  - [x] Tính năng đồng bộ Google Calendar tạo đúng sự kiện kèm thông báo nhắc trước đúng 30 phút.
  - [x] Đánh giá chất lượng 1-5 sao lưu thành công vào cơ sở dữ liệu.

---

#### 👤 Thành viên 7: Đoàn Hải Đăng — DevOps, Docker, Kiểm Thử Tự Động & Tích Hợp Hệ Thống (DevOps, QA & Integration)
- **Họ và tên người phụ trách:** **Đoàn Hải Đăng**
- **Mã số sinh viên (MSSV):** `....................................................`
- **Vai trò chuyên môn:** DevOps Engineer, QA Lead & System Architect
- **Thư mục & File phụ trách:**
  - *DevOps & Scripts:* `docker-compose.yml`, `Dockerfile`, `run_all.bat`, `run_backend.bat`, `run_frontend.bat`, `.gitignore`
  - *Automated Testing Suite:* `server/tests/` (Unit Tests, Integration Tests, Mocking Services)
  - *API Specification & Project Quality:* `docs/openapi.yaml`, `docs/08-testing.md`, `docs/13-demo-qa.md`, `docs/14-checklist.md`
- **Nhiệm vụ cần làm chi tiết:**
  1. *DevOps - Đóng gói Môi trường Triển khai:* Viết `Dockerfile` tối ưu hóa cho Backend FastAPI và Frontend React; viết `docker-compose.yml` kết nối container ứng dụng với container PostgreSQL 16 và mạng nội bộ Docker.
  2. *DevOps - Batch Scripts 1-Click:* Viết và kiểm thử các script khởi chạy tiện lợi trên Windows (`run_all.bat`, `run_backend.bat`, `run_frontend.bat`) giúp các thành viên và giảng viên chấm bài khởi động dự án chỉ với 1 nhấp chuột.
  3. *QA - Xây dựng Bộ Kiểm thử Tự động Toàn diện (`server/tests/` qua `pytest` và `httpx`):*
     - Viết Unit Tests kiểm tra thuật toán Haversine, băm mật khẩu, mã hóa/giải mã JWT token.
     - Viết Integration Tests kiểm tra toàn bộ API Endpoints: Auth (đăng ký/đăng nhập đúng và sai), chặn truy cập không có token (Yêu cầu 1), CRUD Trips, Swap địa điểm, Google Calendar link.
     - Triển khai Mocking cho Gemini API và Google OAuth để bộ test chạy độc lập, tốc độ cao (< 5 giây) và không tốn tiền API thật.
  4. *QA - Kiểm thử Tích hợp Frontend & Responsive:* Rà soát toàn bộ 8 màn hình giao diện, kiểm tra tính responsive trên thiết bị di động, kiểm tra các luồng chuyển trang không phát sinh lỗi Console.
  5. *System Architect - Chuẩn hóa OpenAPI 3.0:* Duy trì và cập nhật file đặc tả tiêu chuẩn `docs/openapi.yaml`, đảm bảo 100% khớp với code API thực tế của nhóm, sẵn sàng import vào Swagger UI và Postman.
  6. *Kịch bản Trình diễn & Bảo vệ Đồ án (`docs/13-demo-qa.md`):*
     - Soạn kịch bản phân vai 7 thành viên trình diễn 5 luồng tính năng thực tế trực tiếp trước hội đồng chấm thi (Live Demo 5 phút).
     - Chuẩn bị sẵn Slide báo cáo và bộ câu hỏi - trả lời phản biện chuyên sâu về kiến trúc phần mềm, bảo mật và kỹ nghệ AI.
- **Tiêu chuẩn nghiệm thu (DoD):**
  - [x] Dự án khởi chạy trơn tru 1-click qua Docker Compose hoặc batch script `run_all.bat`.
  - [x] Bộ test suite `pytest` đạt độ bao phủ (coverage) > 80%, tất cả test cases đều PASS (xanh lá).
  - [x] File đặc tả `docs/openapi.yaml` hợp lệ 100%, không có lỗi schema.
  - [x] Kịch bản demo 5 phút và slide thuyết trình sẵn sàng 100% cho buổi bảo vệ đồ án.

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
