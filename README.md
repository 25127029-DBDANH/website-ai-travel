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

Bảng phân công chi tiết công việc, thư mục/file phụ trách và yêu cầu chuẩn đầu ra (Deliverables) cho từng thành viên. Cột **Người phụ trách** được để trống để nhóm tự phân bổ nhân sự phù hợp:

| STT | Vị trí / Vai trò chuyên môn | Thư mục & File phụ trách chính | Nhiệm vụ chính chi tiết | Yêu cầu chuẩn đầu ra (Deliverables) | Người phụ trách |
| :---: | :---|---|---|---|:---:|
| **1** | **Team Leader / DevOps & Full-Stack Architect** | `/`, `docker-compose.yml`, `.gitignore`, `docs/`, `server/main.py`, `server/requirements.txt` | • Quản lý tiến độ dự án, phân chia công việc theo Sprint.<br>• Thiết lập môi trường Docker Compose (PostgreSQL 16).<br>• Thiết lập CI/CD, chuẩn hóa quy trình Git branch & Pull Request.<br>• Khởi tạo kiến trúc khung (skeleton) cho cả Client (React) và Server (Python FastAPI).<br>• Review mã nguồn, kiểm soát chất lượng code và hợp nhất vào branch `main`. | • Hệ thống Docker và môi trường Python chạy trơn tru.<br>• Cấu hình Git, CI pipeline và tài liệu `docs/` hoàn chỉnh, chuẩn xác.<br>• Server & Client kết nối thông suốt, không xung đột cấu hình. | |
| **2** | **Backend Developer — AI Core & Gemini Orchestration** | `server/app/services/gemini_service.py`, `server/app/api/v1/endpoints/ai.py`, `server/app/schemas/ai.py` | • Tích hợp Google Gemini API (Model 1.5 Pro / Flash qua thư viện `google-generativeai`).<br>• Thiết kế System Instruction tối ưu hóa cho du lịch TP.HCM, am hiểu văn hóa & địa lý từng quận.<br>• Hiện thực luồng tương tác 4 bước: Nhận 8 tiêu chí ➔ Gợi ý tổng quan ➔ Nhận phản hồi ➔ Sinh lịch trình JSON chi tiết từng ngày/giờ.<br>• Xử lý cơ chế Đổi địa điểm (Swap Place): tìm 2-3 địa điểm thay thế tương đương cùng khu vực và cập nhật lại mốc thời gian. | • Endpoint `/api/v1/ai/chat` và quy trình sinh lịch trình hoạt động ổn định.<br>• Phản hồi AI trả về 100% đúng cấu trúc Pydantic Schema quy định.<br>• Tính năng Swap địa điểm gợi ý chính xác và giữ nguyên tính logic của lịch trình. | |
| **3** | **Backend Developer — 3rd-Party Integrations (Places & Calendar)** | `server/app/services/places_service.py`, `server/app/services/calendar_service.py`, `server/app/api/v1/endpoints/calendar.py`, `server/app/api/v1/endpoints/places.py` | • Tích hợp Google Places API (New): Geocoding, tìm kiếm địa điểm, lấy ảnh thumbnail, đánh giá sao và giờ mở cửa.<br>• Tích hợp Google Calendar API: Cấu hình luồng OAuth2 Authorization Code flow bằng Python SDK.<br>• Xây dựng logic tự động chuyển đổi lịch trình du lịch thành chuỗi sự kiện trên Google Calendar kèm mốc giờ và thông báo nhắc nhở trước 30 phút. | • Dữ liệu địa điểm hiển thị đầy đủ tọa độ, địa chỉ thật và hình ảnh thực tế.<br>• Endpoint `/api/v1/calendar/sync` đồng bộ thành công toàn bộ chuyến đi lên Google Calendar của user.<br>• Token Google OAuth được lưu trữ và refresh an toàn trong Database. | |
| **4** | **Backend Developer — Auth, Database & Contingency Planning** | `server/app/db/`, `server/app/core/`, `server/app/api/v1/endpoints/auth.py`, `server/app/api/v1/endpoints/trips.py`, `server/app/services/contingency_service.py`, `server/app/utils/` | • Thiết kế và bảo trì cơ sở dữ liệu PostgreSQL (Users, Preferences, Trips, Days, Activities, Ratings).<br>• Hiện thực xác thực người dùng: Đăng ký, Đăng nhập, băm mật khẩu bcrypt, cấp phát JWT qua `python-jose`.<br>• Bắt buộc đăng nhập: Chặn toàn bộ route bảo vệ bằng dependency `get_current_user` (khách chỉ xem landing).<br>• Xây dựng thuật toán kịch bản dự phòng (`contingency_service.py`): Tự động chuyển địa điểm trong nhà khi mưa, gom cụm địa điểm tránh kẹt xe giờ cao điểm (17h-19h), xử lý khi điểm đóng cửa/quá ngân sách.<br>• Quản lý My Trips, cơ chế chia sẻ hành trình bằng liên kết chỉ xem (`/s/:shareToken`) và lưu đánh giá 1-5 sao. | • Schema Database hoàn thiện với đầy đủ Foreign Keys và Indexes.<br>• API Auth bảo mật cao, kiểm tra JWT chuẩn xác.<br>• Các kịch bản dự phòng thời tiết, kẹt xe, đóng cửa được kích hoạt mượt mà khi có điều kiện kích hoạt.<br>• Cơ chế Share Link bảo mật, hỗ trợ thu hồi quyền truy cập. | |
| **5** | **Frontend Lead — UI/UX, Design System, Layout & Auth Pages** | `client/src/index.css`, `client/tailwind.config.js`, `client/src/components/layout/`, `client/src/components/common/`, `client/src/pages/LandingPage.jsx`, `client/src/pages/LoginPage.jsx`, `client/src/pages/RegisterPage.jsx`, `client/src/context/AuthContext.jsx` | • Xây dựng Design System đồng nhất (màu sắc, typography, responsive chuẩn mobile/desktop).<br>• Xây dựng Layout dùng chung: Navbar chuyên nghiệp, Footer, Sidebar, User Dropdown.<br>• Thiết kế Landing Page ấn tượng dành cho Khách (Hero giới thiệu, trình diễn tính năng, kêu gọi đăng nhập).<br>• Thiết kế và hiện thực màn hình Đăng nhập & Đăng ký tài khoản (hỗ trợ Google OAuth).<br>• Quản lý trạng thái đăng nhập toàn cục qua `AuthContext`, xử lý tự động lưu/xóa token và chuyển hướng bảo vệ route. | • Giao diện chuẩn thẩm mỹ, hiện đại, chuẩn Responsive.<br>• Khách chưa đăng nhập không thể truy cập vào màn hình Planner/Trips.<br>• Luồng đăng nhập, đăng ký và đăng xuất hoạt động trơn tru không phát sinh lỗi giao diện. | |
| **6** | **Frontend Developer — Interactive Map & Chat/Trip Studio** | `client/src/components/map/`, `client/src/components/chat/`, `client/src/components/trip/`, `client/src/pages/PlannerPage.jsx`, `client/src/context/TripContext.jsx`, `client/src/hooks/useMap.js` | • Tích hợp bản đồ Mapbox GL / Google Maps hiển thị marker địa điểm và polyline lộ trình di chuyển.<br>• Xây dựng giao diện Form nhập yêu cầu 8 tiêu chí du lịch TP.HCM (ngày, quận, ngân sách, phong cách...).<br>• Hiện thực giao diện Lời chào cá nhân hóa cho người dùng quay lại (tự động điền form dựa trên chuyến đi cũ).<br>• Xây dựng khung chat tương tác với AI: hiển thị tin nhắn, gợi ý nhanh, hiển thị Mini-map card trong hội thoại.<br>• Hiện thực giao diện Lịch trình chi tiết (Timeline từng ngày, thẻ hoạt động, mốc thời gian, chi phí dự kiến).<br>• Xây dựng Modal đổi địa điểm (Swap Place): hiển thị 2-3 gợi ý thay thế của AI để người dùng chọn. | • Form 8 tiêu chí hoạt động mượt mà, validate dữ liệu đầy đủ.<br>• Bản đồ tương tác đồng bộ nhấp nháy marker khi chọn địa điểm trên timeline.<br>• Giao diện Swap địa điểm trực quan, cập nhật tức thì vào lịch trình. | |
| **7** | **Frontend Developer & QA — Trip Management, Settings & End-to-End Testing** | `client/src/pages/MyTripsPage.jsx`, `client/src/pages/TripDetailPage.jsx`, `client/src/pages/SharedTripPage.jsx`, `client/src/pages/SettingsPage.jsx`, `client/src/services/`, kiểm thử toàn diện | • Xây dựng màn hình My Trips: Xem danh sách chuyến đi, tìm kiếm, lọc theo ngày/quận, xóa chuyến đi.<br>• Xây dựng màn hình Shared Trip: Trang xem lịch trình dạng chỉ đọc (Read-only) khi truy cập qua share link.<br>• Xây dựng tính năng kích hoạt Đồng bộ Google Calendar và thông báo kết quả đồng bộ.<br>• Xây dựng Modal Đánh giá chất lượng lịch trình (Rating 1-5 sao + bình luận).<br>• Xây dựng trang Settings: Xem và cập nhật sở thích du lịch đã lưu trong bộ nhớ AI.<br>• Viết kịch bản kiểm thử End-to-End (E2E), kiểm tra bảo mật (JWT, XSS) và tối ưu hiệu năng toàn bộ hệ thống. | • Trang My Trips và Shared Trips hiển thị chuẩn xác dữ liệu.<br>• Nút bấm "Sync Google Calendar" hoạt động chính xác với thông báo thân thiện.<br>• Đánh giá sao lưu thành công vào cơ sở dữ liệu.<br>• Báo cáo kiểm thử đạt chuẩn chất lượng trước khi bảo vệ đồ án. | |

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
