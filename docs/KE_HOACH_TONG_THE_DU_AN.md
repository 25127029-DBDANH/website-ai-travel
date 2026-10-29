# 📋 TÀI LIỆU KẾ HOẠCH & ĐẶC TẢ KIẾN TRÚC TỔNG THỂ DỰ ÁN (BẢN V3)
## ĐỒ ÁN: HỆ THỐNG LÊN KẾ HOẠCH DU LỊCH TP. HỒ CHÍ MINH TÍCH HỢP TRÍ TUỆ NHÂN TẠO (HCMC AI TRAVEL PLANNER)

> **Phiên bản:** 3.0 (Tích hợp trọn vẹn 7 Yêu cầu mới của Giảng viên)  
> **Phạm vi tài liệu:** Đặc tả toàn diện yêu cầu nghiệp vụ, kiến trúc kỹ thuật, luồng dữ liệu, phân công 7 thành viên và lộ trình bàn giao.  
> **Quy chuẩn đặc tả:** Tài liệu đặc tả phi kỹ thuật mã (Zero-Code Specification) — Toàn bộ cấu trúc cơ sở dữ liệu, thuật toán, API và logic nghiệp vụ được mô tả bằng bảng biểu, văn bản đặc tả logic và sơ đồ luồng, tuyệt đối không chứa các đoạn mã nguồn (code blocks).

---

## 1. TỔNG QUAN DỰ ÁN & BỐI CẢNH DU LỊCH TP. HỒ CHÍ MINH

### 1.1. Bối cảnh Thực tế & Vấn đề Cần Giải Quyết
Thành phố Hồ Chí Minh là trung tâm kinh tế, văn hóa và du lịch sôi động bậc nhất Việt Nam, sở hữu hệ sinh thái điểm đến đa dạng từ di tích lịch sử, kiến trúc cổ, ẩm thực đường phố đến các trung tâm thương mại hiện đại. Tuy nhiên, du khách khi tự lên lịch trình du lịch tại TP.HCM thường đối mặt với các thách thức lớn:
1. **Quá tải thông tin và thiếu tính liên kết địa lý:** Các địa điểm du lịch phân bố rải rác trên nhiều quận huyện (Quận 1, 3, 5, Bình Thạnh, Thủ Đức), khiến người đi dễ chọn các điểm quá xa nhau, dẫn đến kiệt sức và mất thời gian di chuyển.
2. **Đặc thù giao thông giờ cao điểm (17h00 - 19h00):** Tình trạng ùn tắc nghiêm trọng tại các trục đường huyết mạch (Cách Mạng Tháng 8, Nam Kỳ Khởi Nghĩa, Xô Viết Nghệ Tĩnh) làm phá sản các lịch trình di chuyển xuyên tâm vào cuối buổi chiều.
3. **Thời tiết nhiệt đới mưa rào bất chợt:** Những cơn mưa lớn vào buổi chiều khiến các hoạt động tham quan ngoài trời (phố đi bộ, bến tàu, cà phê bệt) bị đình trệ nếu không có phương án thay thế trong nhà.
4. **Lịch trình bị bỏ quên sau khi lập:** Đa số các ứng dụng chỉ xuất file văn bản hoặc ảnh chụp màn hình, người dùng không nhận được thông báo nhắc nhở khi đến giờ diễn ra hoạt động.

### 1.2. Mục Tiêu Sản Phẩm & Giá Trị Cốt Lõi
Hệ thống **HCMC AI Travel Planner** được định vị là một giải pháp thông minh toàn diện, kết hợp năng lực suy luận của mô hình ngôn ngữ lớn (Google Gemini AI) cùng cơ sở dữ liệu địa điểm thực tế từ Google Places API nhằm:
- **Cá nhân hóa theo thời gian thực:** May đo hành trình dựa trên 8 tiêu chí cụ thể của người dùng, phân tích lịch sử sở thích của người dùng quen để đưa ra gợi ý chuẩn xác.
- **Tối ưu hóa không gian và thời gian:** Tự động gom cụm các địa điểm theo phường/quận, sắp xếp lộ trình logic và cảnh báo né các khung giờ kẹt xe.
- **Chủ động ứng phó rủi ro:** Kích hoạt kịch bản dự phòng khi trời mưa hoặc địa điểm đóng cửa chỉ với một cú nhấp chuột.
- **Đồng bộ hóa tiện ích:** Đẩy toàn bộ sự kiện lịch trình sang Google Calendar cá nhân kèm chuông báo thức trước 30 phút.

### 1.3. Bảy Nguyên Tắc Sản Phẩm Nâng Cấp (Tuân Thủ 100% Yêu Cầu Giảng Viên)
1. **Nguyên tắc Xác thực Bắt buộc (Mandatory Identification):** Không cho phép thao tác vô danh trên các tiện ích tạo chuyến. Người dùng bắt buộc phải đăng nhập tài khoản để hệ thống định danh, ghi nhớ lịch sử hội thoại và học hỏi sở thích dài hạn. Khách vãng lai chỉ được xem trang giới thiệu (Landing Page).
2. **Nguyên tắc Hội thoại 4 Bước & Quyền Kiểm Soát Thuộc Về Người Dùng (User-in-the-Loop):** AI không tự ý áp đặt lịch trình ngay lập tức. Quy trình luôn đi qua 4 bước: Thu thập 8 tiêu chí ➔ AI đề xuất ý tưởng tổng quan ➔ Người dùng xác nhận/góp ý ➔ AI sinh lịch trình chi tiết. Người dùng luôn có quyền đổi địa điểm với 2-3 gợi ý thay thế tương đương.
3. **Nguyên tắc Trực quan Hóa Không Gian Bản Đồ (Map-First Interaction):** Bản đồ không chỉ là công cụ phụ mà là trung tâm tương tác. Mọi đề xuất trong khung chat và từng thẻ lịch trình đều có ghim tọa độ thực tế và thẻ bản đồ thu nhỏ (Mini-Map Card).
4. **Nguyên tắc Kịch bản Dự phòng Thường trực (Contingency by Default):** Mọi điểm tham quan ngoài trời đều bắt buộc phải gắn kèm một điểm dự phòng trong nhà (bảo tàng, trung tâm thương mại, workshop) để ứng phó tức thì khi thời tiết chuyển biến xấu.
5. **Nguyên tắc Minh bạch & Đánh giá Cải thiện (Continuous Feedback):** Cung cấp công cụ chia sẻ hành trình chỉ xem an toàn và bảng đánh giá 1-5 sao để AI ghi nhận phản hồi, nâng cao độ chính xác cho các chuyến đi tiếp theo.
6. **Nguyên tắc Kết nối Đột phá (Calendar Integration):** Biến kế hoạch số trên web thành các mốc thông báo nhắc nhở thực tế trên điện thoại người dùng thông qua Google Calendar API.
7. **Nguyên tắc Đồng nhất & Khách quan (Objective Professionalism):** Loại bỏ hoàn toàn các tùy chọn giọng điệu/nhân vật AI (persona) gây nhiễu, định vị AI là một Chuyên gia Du lịch TP.HCM đáng tin cậy, chào mừng đích danh người dùng quay lại và điền sẵn form khảo sát.

---

## 2. PHẠM VI CHỨC NĂNG (SCOPE & MOSCOW MATRIX)

### 2.1. Ma Trận Phân Cấp Tính Năng (MoSCoW Prioritization)

| Mức ưu tiên | Tên tính năng | Mục tiêu nghiệp vụ | Nhóm phụ trách chính |
|---|---|---|---|
| **P0 (Must-Have)** | Xác thực & Bảo vệ tài nguyên | Chặn khách chưa đăng nhập, bắt buộc xác thực JWT cho mọi API tạo chuyến và chat | Backend Auth + Frontend UI |
| **P0 (Must-Have)** | Form khảo sát 8 tiêu chí TP.HCM | Thu thập số ngày, quận, ngân sách, sở thích, số người, phương tiện, nhịp độ, ghi chú | Frontend Chat & Form |
| **P0 (Must-Have)** | Luồng tương tác AI 4 bước | Gợi ý ý tưởng trước khi sinh lịch trình chi tiết, đảm bảo người dùng đồng ý | Backend AI + Frontend |
| **P0 (Must-Have)** | Đổi địa điểm (Swap Place) | Gợi ý 2-3 địa điểm thay thế tương đương cùng khu vực và tính lại mốc thời gian | Backend AI + Frontend |
| **P0 (Must-Have)** | Bản đồ tương tác & Mini-Map | Hiển thị vị trí thực, marker có phân loại màu sắc, mini map trong khung chat | Frontend Map + Backend |
| **P0 (Must-Have)** | Kịch bản dự phòng thời tiết/kẹt xe | Nút chuyển đổi điểm trong nhà khi mưa, cảnh báo né trục đường kẹt xe 17h-19h | Backend AI + Frontend |
| **P0 (Must-Have)** | Quản lý My Trips & Share Link | Xem danh sách chuyến, xem chi tiết, sao chép link chỉ xem (/s/:shareToken) | Frontend QA + Backend DB |
| **P0 (Must-Have)** | Đánh giá chất lượng lịch trình | Modal chấm điểm 1-5 sao và lưu góp ý cải thiện bộ nhớ AI | Frontend QA + Backend DB |
| **P0 (Must-Have)** | Đồng bộ Google Calendar | Tạo sự kiện tự động theo khung giờ có nhắc nhở báo thức trước 30 phút | Backend Integrations |
| **P0 (Must-Have)** | Nhận diện & Điền sẵn người dùng cũ | Chào mừng đích danh, tự động điền form dựa trên chuyến đi trước đó | Backend Auth + Frontend |
| **P1 (Should-Have)**| Lọc nâng cao theo quận | Tìm kiếm và lọc nhanh danh sách địa điểm theo từng quận huyện TP.HCM | Frontend Map |
| **P1 (Should-Have)**| Ước tính chi phí chi tiết | Phân rã ngân sách cho từng bữa ăn, vé tham quan và cà phê theo ngày | Backend AI |
| **P2 (Could-Have)** | Xuất file lịch tiêu chuẩn (.ics) | Tải file lịch dự phòng cho các ứng dụng Outlook, Apple Calendar | Backend Integrations |
| **Won't-Have (Bỏ)**| Khách chat tự do không tài khoản | Bỏ hoàn toàn để tuân thủ Yêu cầu 1 của giảng viên | Toàn nhóm |
| **Won't-Have (Bỏ)**| Tùy chọn Nhân vật / Giọng điệu AI | Bỏ tính cách hài hước/bụi bặm để tuân thủ Yêu cầu 7 của giảng viên | Toàn nhóm |

### 2.2. Các Chiều Phân Loại Người Dùng Thực Tế
- **Người dùng mới (First-time Traveler):** Lần đầu truy cập, sau khi đăng ký tài khoản sẽ được hướng dẫn qua Form 8 tiêu chí với các chú thích rõ ràng về từng quận tại TP.HCM.
- **Người dùng quay lại (Returning Traveler):** Hệ thống nhận diện qua ID tài khoản, hiển thị thông báo chào mừng đích danh, hiển thị nút "Điền trước từ sở thích cũ" giúp tiết kiệm thời gian nhập liệu.
- **Người xem qua liên kết chia sẻ (Shared Viewer):** Người nhận được đường link dạng chỉ xem (/s/:token). Được xem toàn bộ timeline và bản đồ nhưng không thể chỉnh sửa, có nút kêu gọi đăng ký tài khoản để tạo chuyến đi riêng.

---

## 3. KIẾN TRÚC HỆ THỐNG & CẤU TRÚC THƯ MỤC TRIỂN KHAI

### 3.1. Sơ Đồ Kiến Trúc Khối 3 Tầng
Hệ thống được tổ chức theo mô hình kiến trúc phân tầng chuẩn công nghiệp:
- **Tầng Giao diện (Presentation Layer - Client):** Ứng dụng Single Page Application (SPA) xây dựng trên nền tảng React 18, Vite và Tailwind CSS. Quản lý trạng thái thông qua React Context API, giao tiếp với máy chủ bằng Axios Client có cơ chế chặn đính kèm Token bảo mật.
- **Tầng Xử lý Nghiệp vụ & Dịch vụ (Business Logic & Service Layer - Server):** Máy chủ RESTful API phát triển bằng Python (FastAPI). Chịu trách nhiệm thực thi các ràng buộc bảo mật, điều phối các mô hình AI (Google Gemini 1.5), tra cứu dữ liệu địa điểm (Google Places API), tạo sự kiện lịch (Google Calendar API) và thuật toán tính toán di chuyển (Haversine Transit Calculator).
- **Tầng Dữ liệu & Lưu trữ (Data Persistence Layer):** Hệ cơ sở dữ liệu quan hệ (PostgreSQL 16 hoặc SQLite cho môi trường phát triển cục bộ). Quản lý toàn bộ thông tin tài khoản, sở thích du lịch dài hạn, các chuyến đi, hoạt động chi tiết từng giờ và đánh giá sao.

### 3.2. Cấu Trúc Thư Mục Triển Khai Toàn Diện

```plaintext
website-ai-travel-main/
│
├── run_all.bat                     # Script 1-click khởi chạy đồng thời cả Backend và Frontend
├── run_backend.bat                 # Script khởi chạy riêng máy chủ Python FastAPI
├── run_frontend.bat                # Script khởi chạy riêng giao diện React Vite
├── docker-compose.yml              # Cấu hình container dịch vụ cơ sở dữ liệu PostgreSQL 16
├── README.md                       # Tài liệu hướng dẫn sử dụng, giải thích kiến trúc và phân công
│
├── ke-hoach-chi-tiet/             # THƯ MỤC KẾ HOẠCH MỚI (Tài liệu đặc tả toàn diện không code)
│   └── KE_HOACH_TONG_THE_DU_AN.md  # File kế hoạch tổng thể chuẩn hóa theo 7 yêu cầu mới
│
├── docs/                           # Thư mục lưu trữ các tài liệu kiến trúc, đặc tả OpenAPI
│   ├── yeu-cau-moi.md              # Phân tích chi tiết 7 yêu cầu mới của giảng viên
│   ├── user-flow.md                # Sơ đồ quy trình trải nghiệm người dùng
│   ├── kien-truc-api-db.md         # Đặc tả kỹ thuật kiến trúc, database và danh mục API
│   ├── ke-hoach-thuc-hien.md       # Bảng phân rã công việc WBS và tiêu chí Definition of Done
│   ├── thay-doi-so-voi-ke-hoach-cu.md # So sánh điểm mới so với tài liệu kế hoạch cũ
│   └── openapi.yaml                # Đặc tả giao tiếp REST API chuẩn quốc tế OpenAPI 3.0
│
├── client/                         # KHU VỰC MÃ NGUỒN FRONTEND (React 18 + Vite + Tailwind CSS)
│   ├── index.html                  # File HTML gốc của ứng dụng giao diện
│   ├── package.json                # Khai báo các gói thư viện phụ thuộc Frontend
│   ├── vite.config.js              # Cấu hình máy chủ Vite và proxy định tuyến API
│   ├── tailwind.config.js          # Cấu hình hệ thống thiết kế màu sắc, khoảng cách Tailwind
│   ├── postcss.config.js           # Cấu hình plugin xử lý CSS
│   │
│   └── src/                        # Không gian mã nguồn chính của Frontend
│       ├── main.jsx                # Điểm khởi chạy React DOM, bọc các tầng Context Provider
│       ├── App.jsx                 # Bộ định tuyến trung tâm và phân quyền Protected Routes
│       ├── index.css               # Định nghĩa các chỉ thị style toàn cục
│       │
│       ├── context/                # Quản lý trạng thái toàn cục của ứng dụng
│       │   ├── AuthContext.jsx     # Trạng thái đăng nhập, lưu trữ token, thông tin user
│       │   └── TripContext.jsx     # Trạng thái dữ liệu chuyến đi hiện hành và bản đồ
│       │
│       ├── services/               # Tầng giao tiếp mạng HTTP Client
│       │   └── api.js              # Cấu hình Axios instance tự động đính kèm Bearer JWT
│       │
│       ├── components/             # Các khối giao diện tái sử dụng
│       │   ├── layout/             # Khung bố cục dùng chung
│       │   │   ├── Navbar.jsx      # Thanh điều hướng trên cùng, avatar, nút đăng nhập/đăng xuất
│       │   │   └── Footer.jsx      # Chân trang thông tin bản quyền và thành viên nhóm
│       │   │
│       │   ├── map/                # Thành phần bản đồ tương tác
│       │   │   └── InteractiveMap.jsx # Bản đồ TP.HCM, marker tọa độ thực, chế độ mini map
│       │   │
│       │   ├── chat/               # Thành phần khung trò chuyện AI
│       │   │   └── ChatBox.jsx     # Giao diện hội thoại, hiển thị tin nhắn, chip gợi ý nhanh
│       │   │
│       │   └── trip/               # Thành phần hiển thị và tương tác lịch trình
│       │       ├── DayTimeline.jsx # Timeline từng ngày, thẻ hoạt động theo mốc thời gian
│       │       ├── SwapModal.jsx   # Hộp thoại đổi địa điểm với 2-3 gợi ý thay thế của AI
│       │       ├── CalendarModal.jsx # Hộp thoại xác nhận đồng bộ Google Calendar
│       │       └── RatingModal.jsx # Hộp thoại chấm điểm 1-5 sao và gửi góp ý cho AI
│       │
│       └── pages/                  # Các màn hình chức năng hoàn chỉnh
│           ├── LandingPage.jsx     # Trang giới thiệu cho khách vãng lai, nút kêu gọi đăng nhập
│           ├── LoginPage.jsx       # Trang đăng nhập kèm nút điền sẵn tài khoản thử nghiệm
│           ├── RegisterPage.jsx    # Trang đăng ký tài khoản người dùng mới
│           ├── PlannerPage.jsx     # Màn hình chính: Form 8 tiêu chí, Luồng 4 bước, Map & Chat
│           ├── MyTripsPage.jsx     # Màn hình quản lý danh sách chuyến đi, tìm kiếm, nút chia sẻ
│           ├── TripDetailPage.jsx  # Màn hình xem chi tiết lịch trình, nút đồng bộ Calendar
│           ├── SharedTripPage.jsx  # Màn hình xem công khai chỉ xem qua liên kết chia sẻ
│           └── SettingsPage.jsx    # Màn hình quản lý sở thích du lịch trong bộ nhớ AI
│
└── server/                         # KHU VỰC MÃ NGUỒN BACKEND (Python 3.11+ / FastAPI)
    ├── main.py                     # Điểm khởi chạy ứng dụng FastAPI và máy chủ Uvicorn
    ├── requirements.txt            # Danh mục các gói thư viện Python (FastAPI, Pydantic, etc.)
    ├── .env.example                # Bản mẫu khai báo biến môi trường (API Key, Secret Key)
    ├── travel_ai.db                # Cơ sở dữ liệu SQLite khởi tạo tự động khi chạy máy chủ
    │
    └── app/                        # Gói module mã nguồn ứng dụng Backend
        ├── core/                   # Cấu hình nền tảng và cơ chế bảo mật
        │   ├── config.py           # Quản lý cài đặt cấu hình hệ thống bằng Pydantic
        │   ├── security.py         # Logic băm mật khẩu an toàn và mã hóa/giải mã JWT
        │   └── dependencies.py     # Cơ chế chặn xác thực Bearer JWT bắt buộc đăng nhập
        │
        ├── db/                     # Tầng lưu trữ cơ sở dữ liệu
        │   ├── database.py         # Quản lý kết nối cơ sở dữ liệu, tự động tạo bảng ban đầu
        │   ├── schema.sql          # Kịch bản lược đồ cấu trúc bảng dữ liệu quan hệ
        │   └── hcmc_data.py        # Cơ sở dữ liệu 50+ địa điểm thực tế tại các quận TP.HCM
        │
        ├── schemas/                # Định nghĩa cấu trúc dữ liệu Pydantic đầu vào và đầu ra
        │   ├── user.py             # Cấu trúc đăng ký, đăng nhập, thông tin người dùng
        │   ├── trip.py             # Cấu trúc form 8 tiêu chí, đổi địa điểm, đánh giá sao
        │   ├── ai.py               # Cấu trúc tin nhắn chat, thẻ mini map, gợi ý nhanh
        │   └── calendar.py         # Cấu trúc yêu cầu và kết quả đồng bộ Google Calendar
        │
        ├── services/               # Tầng xử lý nghiệp vụ thông minh và dịch vụ bên ngoài
        │   ├── gemini_service.py   # Xây dựng System Instruction, gọi AI Gemini sinh lịch trình
        │   ├── places_service.py   # Tra cứu thông tin địa điểm thật qua Google Places API
        │   ├── calendar_service.py # Xây dựng sự kiện Google Calendar kèm báo thức 30 phút
        │   └── contingency_service.py # Xử lý kịch bản dự phòng trời mưa và kẹt xe 17h-19h
        │
        ├── utils/                  # Tiện ích tính toán thuật toán dùng chung
        │   └── transit_calculator.py # Thuật toán Haversine tính khoảng cách và giờ di chuyển
        │
        └── api/                    # Tầng định tuyến các điểm giao tiếp API
            └── v1/
                ├── api.py          # Tập hợp và gắn kết toàn bộ các router nhánh
                └── endpoints/
                    ├── auth.py     # Xử lý đăng ký, đăng nhập, hồ sơ cá nhân và sở thích cũ
                    ├── trips.py    # Xử lý gợi ý bước 2, tạo chuyến, My Trips, swap, chia sẻ
                    ├── ai.py       # Xử lý hội thoại chat AI và phản hồi kèm mini map
                    ├── places.py   # Xử lý tìm kiếm và tra cứu địa điểm du lịch TP.HCM
                    └── calendar.py # Xử lý tạo link và đồng bộ Google Calendar
```

### 3.3. Đặc Tả Danh Mục API Endpoints (API Specification)

| Nhóm chức năng | Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Tham số đầu vào (Inputs) | Dữ liệu trả về (Outputs) | Yêu cầu xác thực |
|---|---|---|---|---|---|:---:|
| **Xác thực** | POST | `/api/v1/auth/register` | Đăng ký tài khoản mới | Email, mật khẩu, họ tên | Token JWT, thông tin user | Công khai |
| **Xác thực** | POST | `/api/v1/auth/login` | Đăng nhập hệ thống | Email, mật khẩu | Token JWT, thông tin user | Công khai |
| **Xác thực** | GET | `/api/v1/auth/me` | Lấy thông tin cá nhân | Không | ID, email, họ tên, ảnh đại diện | Bắt buộc JWT |
| **Sở thích cũ** | GET | `/api/v1/auth/preferences` | Lấy sở thích chuyến trước | Không | Quận yêu thích, phong cách, phương tiện | Bắt buộc JWT |
| **Sở thích cũ** | PUT | `/api/v1/auth/preferences` | Cập nhật bộ nhớ sở thích | Danh sách quận, danh mục, phương tiện | Thông báo cập nhật thành công | Bắt buộc JWT |
| **AI Luồng 4 bước** | POST | `/api/v1/trips/suggest` | Bước 2: AI gợi ý ý tưởng | Dữ liệu form 8 tiêu chí | Tóm tắt ý tưởng, điểm nhấn, chi phí | Bắt buộc JWT |
| **AI Luồng 4 bước** | POST | `/api/v1/trips/create` | Bước 4: Sinh lịch trình chi tiết | Dữ liệu form 8 tiêu chí | ID chuyến đi, link chia sẻ, lịch từng giờ | Bắt buộc JWT |
| **Bộ sưu tập** | GET | `/api/v1/trips/my-trips` | Lấy danh sách My Trips | Không | Danh sách các chuyến đi đã lưu | Bắt buộc JWT |
| **Chi tiết chuyến** | GET | `/api/v1/trips/{trip_id}` | Xem chi tiết chuyến đi | ID chuyến đi trên URL | Đầy đủ ngày, hoạt động, mốc giờ | Bắt buộc JWT |
| **Đổi địa điểm** | POST | `/api/v1/trips/swap-place` | Đổi điểm theo gợi ý AI | ID chuyến, ID hoạt động, điểm hiện tại | 2-3 địa điểm thay thế tương đương | Bắt buộc JWT |
| **Dự phòng** | POST | `/api/v1/trips/{id}/contingency`| Kích hoạt phương án mưa/kẹt xe | Lý do: trời mưa hoặc kẹt xe 17h-19h | Lịch trình sau khi đổi điểm trong nhà | Bắt buộc JWT |
| **Đánh giá AI** | POST | `/api/v1/trips/{id}/rating` | Chấm điểm lịch trình AI | Số sao (1-5), nhận xét văn bản | Thông báo lưu vào bộ nhớ AI | Bắt buộc JWT |
| **Chia sẻ xem** | GET | `/api/v1/trips/shared/{token}` | Xem lịch trình công khai | Mã token chia sẻ trên URL | Lịch trình dạng chỉ xem (Read-only) | Công khai |
| **Chat tương tác** | POST | `/api/v1/ai/chat` | Trò chuyện cùng AI | Câu hỏi người dùng | Câu trả lời, mini-map card, gợi ý nhanh | Bắt buộc JWT |
| **Đồng bộ lịch** | POST | `/api/v1/calendar/sync` | Đẩy sự kiện Google Calendar | ID chuyến đi, số phút nhắc nhở (30) | Danh sách link Google Calendar chi tiết | Bắt buộc JWT |

### 3.4. Đặc Tả Lược Đồ Cơ Sở Dữ Liệu Quan Hệ (Database Schema Specification)

#### Bảng 1: Người dùng hệ thống (users)
- **Mục đích:** Quản lý tài khoản, danh tính và phân quyền đăng nhập bắt buộc.
- **Các trường dữ liệu:**
  - `id`: Định danh duy nhất (UUID/Chuỗi ký tự), Khóa chính.
  - `email`: Địa chỉ hòm thư điện tử, Duy nhất, Bắt buộc nhập.
  - `password_hash`: Chuỗi mã hóa mật khẩu bảo mật (SHA-256 kèm muối), Bắt buộc nhập.
  - `full_name`: Họ và tên hiển thị của người dùng, Bắt buộc nhập.
  - `avatar_url`: Đường dẫn ảnh đại diện người dùng.
  - `created_at`: Mốc thời gian tạo tài khoản.

#### Bảng 2: Sở thích & Bộ nhớ du lịch (user_preferences)
- **Mục đích:** Phục vụ Yêu cầu 1 và Yêu cầu 7, lưu trữ thói quen du lịch để điền sẵn cho người dùng quay lại.
- **Các trường dữ liệu:**
  - `user_id`: Khóa ngoại tham chiếu đến bảng người dùng, Khóa chính.
  - `favorite_districts`: Danh sách các quận yêu thích nhất tại TP.HCM (Quận 1, 3, 5...).
  - `preferred_categories`: Danh sách các phong cách ưa chuộng (ẩm thực, di tích, cà phê...).
  - `budget_level`: Mức chi tiêu trung bình (Tiết kiệm, Vừa phải, Cao cấp).
  - `transport_mode`: Phương tiện di chuyển quen thuộc (Xe máy, Taxi/Grab, Đi bộ).
  - `dietary_notes`: Ghi chú riêng về khẩu vị, thói quen ăn uống, dị ứng thực phẩm.
  - `ai_memory_notes`: Ghi chú tổng hợp do AI ghi nhận sau các lần đánh giá lịch trình.
  - `updated_at`: Mốc thời gian cập nhật sở thích gần nhất.

#### Bảng 3: Chuyến đi du lịch (trips)
- **Mục đích:** Quản lý thông tin tổng quan của từng chuyến đi do người dùng tạo.
- **Các trường dữ liệu:**
  - `id`: Định danh duy nhất của chuyến đi, Khóa chính.
  - `user_id`: Khóa ngoại liên kết tới người sở hữu chuyến đi, Bắt buộc có.
  - `title`: Tên tiêu đề của hành trình du lịch.
  - `start_date`: Ngày bắt đầu chuyến đi.
  - `end_date`: Ngày kết thúc chuyến đi.
  - `num_days`: Tổng số ngày của chuyến đi (từ 1 đến 7 ngày).
  - `stay_district`: Quận lưu trú hoặc trung tâm tập trung chính tại TP.HCM.
  - `budget_total`: Tổng ngân sách dự kiến cho toàn bộ chuyến đi.
  - `group_size`: Số lượng thành viên tham gia chuyến đi.
  - `transport_mode`: Phương tiện di chuyển chính trong lịch trình.
  - `pace_preference`: Nhịp độ di chuyển (Thư thả, Vừa phải, Dày đặc).
  - `special_notes`: Các yêu cầu hoặc ghi chú đặc biệt từ người dùng.
  - `status`: Trạng thái chuyến đi (Đang hoạt động, Bản nháp, Đã hoàn thành).
  - `share_token`: Chuỗi ngẫu nhiên bảo mật dùng để chia sẻ lịch trình chỉ xem.
  - `google_calendar_synced`: Cờ đánh dấu chuyến đi đã được đồng bộ lên Google Calendar hay chưa.
  - `created_at`: Mốc thời gian khởi tạo chuyến đi.

#### Bảng 4: Hoạt động chi tiết từng giờ (activities)
- **Mục đích:** Lưu trữ các chặng tham quan, ăn uống cụ thể của từng ngày.
- **Các trường dữ liệu:**
  - `id`: Định danh duy nhất của hoạt động, Khóa chính.
  - `trip_id`: Khóa ngoại tham chiếu đến chuyến đi sở thuộc.
  - `day_number`: Số thứ tự của ngày (Ngày 1, Ngày 2...).
  - `place_name`: Tên địa điểm du lịch, quán ăn hoặc điểm tham quan.
  - `category`: Phân loại hoạt động (Di tích lịch sử, Ẩm thực, Cà phê, Mua sắm).
  - `district`: Quận tọa lạc của địa điểm tại TP.HCM.
  - `address`: Địa chỉ đường phố thực tế.
  - `latitude`: Tọa độ vĩ độ địa lý (phục vụ hiển thị marker trên bản đồ).
  - `longitude`: Tọa độ kinh độ địa lý.
  - `start_time`: Thời gian bắt đầu hoạt động (định dạng Giờ:Phút).
  - `end_time`: Thời gian kết thúc hoạt động.
  - `cost_estimate`: Chi phí dự kiến cho hoạt động này.
  - `contingency_indoor_place`: Tên địa điểm trong nhà có mái che dự phòng khi trời mưa.
  - `description`: Đoạn văn ngắn mô tả nét đặc sắc, mẹo trải nghiệm tại địa điểm.

#### Bảng 5: Đánh giá chất lượng lịch trình (ratings)
- **Mục đích:** Phục vụ Yêu cầu 5, lưu trữ phản hồi của người dùng để cải thiện thuật toán AI.
- **Các trường dữ liệu:**
  - `id`: Định danh bản ghi đánh giá, Khóa chính.
  - `trip_id`: Khóa ngoại liên kết tới chuyến đi được chấm điểm.
  - `user_id`: Khóa ngoại liên kết tới người thực hiện đánh giá.
  - `rating_stars`: Điểm số đánh giá từ 1 đến 5 sao.
  - `feedback_text`: Lời nhận xét chi tiết và đóng góp ý kiến của người dùng.
  - `created_at`: Mốc thời gian gửi đánh giá.

---

## 4. ĐẶC TẢ LUỒNG TRÍ TUỆ NHÂN TẠO & PROMPT ENGINEERING

### 4.1. Quy Chuẩn System Instruction Dành Cho AI Chuyên Gia Du Lịch TP.HCM
AI đóng vai trò là một Chuyên Gia Bản Địa am hiểu sâu sắc về Thành phố Hồ Chí Minh, tuân thủ các nguyên tắc giao tiếp cốt lõi sau:
1. **Kiến thức địa lý chuẩn xác:** Nắm rõ ranh giới các quận trung tâm (Quận 1, Quận 3), khu Chợ Lớn đậm bản sắc văn hóa người Hoa (Quận 5, Quận 6, Quận 11), khu đô thị mới ven sông (Bình Thạnh, Thủ Đức) và các quận ẩm thực đêm nổi tiếng (Quận 4, Phú Nhuận).
2. **Ý thức về thời gian và nhịp sống đô thị:** Luôn phân bổ khoảng nghỉ trưa hợp lý tránh nắng nóng Sài Gòn (12h00 - 14h00), không bố trí di chuyển qua các điểm giao thông xung đột vào giờ cao điểm tan tầm (17h00 - 19h00).
3. **Định dạng phản hồi có cấu trúc:** Phản hồi luôn rõ ràng, mạch lạc, tự động đính kèm thông tin vị trí tọa độ để đồng bộ trực tiếp lên Bản đồ tương tác và Mini-Map card.

### 4.2. Quy Trình Hội Thoại 4 Bước Chuẩn Hóa
Quy trình được thiết kế nhằm đảm bảo người dùng có toàn quyền kiểm soát và không bao giờ bị bất ngờ bởi lịch trình AI tạo ra:
- **Bước 1 (Thu thập 8 tiêu chí):** Người dùng điền bảng yêu cầu gồm: Số ngày, Quận lưu trú, Ngân sách, Sở thích, Số người, Phương tiện, Nhịp độ, Ghi chú.
- **Bước 2 (Gợi ý tổng quan & Ý tưởng định hướng):** AI phân tích 8 tiêu chí và đưa ra một bản phác thảo ngắn gọn: Chủ đề chính của từng ngày, điểm nhấn nổi bật, dự toán chi tiêu mỗi ngày và danh sách các quận sẽ đi qua. Chưa xuất lịch trình từng giờ.
- **Bước 3 (Người dùng xác nhận & Điều chỉnh):** Người dùng đọc bản ý tưởng tổng quan. Nếu chưa ưng ý, người dùng có thể quay lại chỉnh sửa tiêu chí hoặc nhắn tin góp ý thêm. Khi người dùng bấm nút đồng ý xác nhận, hệ thống mới kích hoạt bước tiếp theo.
- **Bước 4 (Sinh lịch trình chi tiết từng giờ):** AI phân bổ các hoạt động sáng, trưa, chiều, tối với đầy đủ mốc giờ, địa chỉ thật, chi phí dự kiến, tọa độ bản đồ và điểm dự phòng khi mưa.

### 4.3. Đặc Tả Thuật Toán Tính Năng Đổi Địa Điểm (Swap Place)
Khi người dùng không ưng ý một địa điểm bất kỳ trên timeline:
1. **Tiếp nhận yêu cầu:** Người dùng bấm nút "Đổi địa điểm" tại thẻ hoạt động tương ứng.
2. **Thuật toán tìm kiếm thay thế:** AI tiến hành lọc trong cơ sở dữ liệu các địa điểm thỏa mãn 3 điều kiện:
   - Cùng phân loại trải nghiệm hoặc bổ trợ cho phân loại cũ (ví dụ: đổi quán cà phê sang một quán cà phê vintage khác, hoặc đổi bảo tàng sang nhà triển lãm mỹ thuật).
   - Nằm trong cùng bán kính địa lý với quận hiện tại để không làm xáo trộn lộ trình di chuyển của cả ngày.
   - Phù hợp với mức chi tiêu của chuyến đi.
3. **Hiển thị 2-3 gợi ý:** Hệ thống hiển thị hộp thoại pop-up gồm 2-3 lựa chọn thay thế chi tiết kèm tên, địa chỉ, rating và mô tả ngắn.
4. **Cập nhật tức thì:** Khi người dùng chọn 1 phương án mới, hoạt động trên lịch trình lập tức được thay thế và bản đồ tự động di chuyển ghim marker tới tọa độ mới.

---

## 5. CHIẾN LƯỢC XỬ LÝ LỖI & KỊCH BẢN DỰ PHÒNG THÔNG MINH

### 5.1. Kịch Bản Ứng Phó Thời Tiết Xấu (Trời Mưa Sài Gòn)
- **Tình huống kích hoạt:** Người dùng bấm nút "Kích hoạt Trời Mưa" trên thanh công cụ hoặc thời tiết thực tế có mưa rào.
- **Quy tắc chuyển đổi:** Hệ thống rà soát toàn bộ các hoạt động ngoài trời trong ngày (như dạo phố đi bộ Nguyễn Huệ, ngồi cà phê bệt Hồ Con Rùa, ngắm cảnh bến Bạch Đằng).
- **Hành động thay thế:** Tự động hoán đổi sang trường `contingency_indoor_place` đã chuẩn bị sẵn:
  - Phố đi bộ chuyển thành khu phức hợp mua sắm Takashimaya hoặc Chung cư cà phê 42 Nguyễn Huệ có mái che và điều hòa.
  - Cà phê vỉa hè ngoài trời chuyển thành không gian cà phê nghệ thuật trong nhà.
  - Ngắm cảnh ngoài trời chuyển thành tham quan Bảo tàng Mỹ thuật hoặc Bảo tàng Lịch sử TP.HCM.

### 5.2. Kịch Bản Giờ Cao Điểm Giao Thông (17h00 - 19h00)
- **Tình huống kích hoạt:** Hoạt động rơi vào khung giờ từ 17h00 đến 19h00 các ngày trong tuần.
- **Quy tắc điều phối:**
  - Tuyệt đối không sắp xếp các chặng di chuyển xuyên quận qua các trục đường hay ùn ứ (trục nối Quận 1 với Bình Thạnh qua cầu Thị Nghè, trục Cộng Hòa - Trường Chinh, trục Nam Kỳ Khởi Nghĩa ra sân bay).
  - Áp dụng kỹ thuật gom cụm (Clustering): Ưu tiên sắp xếp điểm ăn tối hoặc quán cà phê nghỉ ngơi cách điểm tham quan buổi chiều dưới 1.5 km để du khách đi bộ hoặc di chuyển rất ngắn, chờ qua giờ cao điểm mới tiếp tục hành trình.

### 5.3. Kịch Bản Dự Phòng Ngoại Tuyến (Offline & Quota Fallback)
- **Tình huống kích hoạt:** Mất kết nối mạng Internet hoặc API Key của Google Gemini bị hết hạn mức (Quota Exceeded / Lỗi 429).
- **Quy tắc hoạt động:** Hệ thống tự động chuyển sang Chế độ Dự phòng Nội hạt (Local Fallback Engine), sử dụng bộ dữ liệu 50+ địa điểm TP.HCM đã nạp sẵn trong cơ sở dữ liệu để tạo lịch trình logic mà không gây gián đoạn trải nghiệm của người dùng.

---

## 6. ĐẶC TẢ TÍNH NĂNG ĐỘT PHÁ: ĐỒNG BỘ GOOGLE CALENDAR

### 6.1. Mục Tiêu & Cơ Chế Hoạt Động
Tính năng này giải quyết bài toán lịch trình bị bỏ quên bằng cách tích hợp trực tiếp vào ứng dụng Google Calendar có sẵn trên điện thoại và máy tính của du khách:
1. **Tạo sự kiện theo khung giờ:** Mỗi hoạt động tham quan, ăn uống được chuyển đổi thành một sự kiện trên lịch với thời gian bắt đầu và kết thúc cụ thể.
2. **Cài đặt thông báo trước 30 phút:** Mọi sự kiện đều được thiết lập thông báo báo thức (Popup notification / Email reminder) trước 30 phút để du khách kịp chuẩn bị trang phục, gọi xe di chuyển.
3. **Đầy đủ dữ liệu dẫn đường:** Trong phần mô tả và địa điểm của sự kiện trên Google Calendar có ghi rõ địa chỉ thực tế, chi phí dự kiến và mẹo trải nghiệm, du khách có thể bấm trực tiếp vào địa chỉ để mở Google Maps chỉ đường.
4. **Hỗ trợ 2 phương thức tiện lợi:**
   - *Phương thức liên kết trực tiếp (1-Click Web Link):* Tạo đường dẫn URL mở thẳng ứng dụng Google Calendar trên trình duyệt hoặc điện thoại để người dùng lưu ngay mà không cần cấp quyền tài khoản phức tạp.
   - *Phương thức đồng bộ qua API:* Kết nối tài khoản Google qua OAuth2 để đồng bộ tự động toàn bộ chuyến đi trong một lần nhấn nút.

---

## 7. TIÊU CHUẨN BẢO MẬT & TOÀN VẸN DỮ LIỆU

### 7.1. Cơ Chế Xác Thực Bắt Buộc (Mandatory Authentication)
- Mọi tài nguyên quản lý lịch trình, tạo chuyến đi và trò chuyện cùng AI đều được bảo vệ nghiêm ngặt.
- Khi người dùng gửi yêu cầu lên máy chủ, tiêu đề Authorization phải chứa mã thông báo Bearer Token hợp lệ.
- Máy chủ giải mã chữ ký bảo mật và kiểm tra thời hạn hiệu lực của mã thông báo. Nếu không hợp lệ hoặc đã hết hạn, hệ thống trả về mã lỗi 401 Unauthorized và giao diện tự động điều hướng người dùng về trang đăng nhập.

### 7.2. Bảo Mật Liên Kết Chia Sẻ Công Khai (/s/:shareToken)
- Chuyến đi khi được chia sẻ ra bên ngoài sẽ sử dụng một chuỗi mã ngẫu nhiên bảo mật cao (12 ký tự ngẫu nhiên), không sử dụng ID tuần tự để ngăn chặn việc dò quét dữ liệu.
- Người nhận liên kết chỉ có quyền xem nội dung (Read-only), không thể chỉnh sửa, xóa hoặc thay đổi bất kỳ hoạt động nào của chủ sở hữu.
- Chủ sở hữu có thể thu hồi quyền chia sẻ bất kỳ lúc nào trong trang quản lý chuyến đi.

---

## 8. KẾ HOẠCH KIỂM THỬ TOÀN DIỆN (TESTING STRATEGY)

Bảng danh mục các kịch bản kiểm thử trọng yếu phục vụ nghiệm thu đồ án:

| Mã kiểm thử | Thành phần | Nội dung kịch bản kiểm thử | Kết quả kỳ vọng đạt chuẩn |
|:---:|---|---|---|
| **TC-01** | Xác thực | Truy cập trực tiếp trang `/planner` khi chưa đăng nhập | Bị chặn và tự động chuyển hướng về trang `/login` |
| **TC-02** | Xác thực | Đăng nhập với tài khoản thử nghiệm hợp lệ | Đăng nhập thành công, lưu token và chuyển vào trang `/planner` |
| **TC-03** | Khảo sát | Nhập thiếu tiêu chí trên Form 8 trường | Hiển thị cảnh báo lỗi, không cho gửi yêu cầu lên máy chủ |
| **TC-04** | Luồng 4 bước | Gửi form khảo sát 8 tiêu chí | Bước 2 hiển thị bản tóm tắt ý tưởng, chưa xuất lịch trình chi tiết |
| **TC-05** | Luồng 4 bước | Bấm nút xác nhận đồng ý ở Bước 3 | Bước 4 sinh đầy đủ lịch trình chi tiết từng giờ theo đúng số ngày |
| **TC-06** | Đổi địa điểm | Bấm nút 'Đổi địa điểm' tại một chặng trên timeline | Hiển thị pop-up với đúng 2-3 gợi ý thay thế cùng quận |
| **TC-07** | Đổi địa điểm | Chọn một địa điểm mới trong danh sách gợi ý | Thẻ lịch trình cập nhật thông tin mới, bản đồ ghim marker mới |
| **TC-08** | Dự phòng mưa | Bấm nút 'Kích hoạt Trời Mưa' trên thanh công cụ | Các điểm ngoài trời tự động đổi sang bảo tàng/khu trong nhà |
| **TC-09** | Bản đồ | Bấm vào một điểm trên timeline | Bản đồ tương tác tự động highlight và hiển thị thẻ thông tin |
| **TC-10** | Chat AI | Gửi câu hỏi kèm từ khóa 'quán ốc' hoặc 'thời tiết' | AI phản hồi chuẩn xác và gửi kèm thẻ Mini-Map trong đoạn chat |
| **TC-11** | Calendar | Bấm nút 'Đồng Bộ Google Calendar' | Hiển thị danh sách sự kiện có cài đặt nhắc trước 30 phút |
| **TC-12** | Đánh giá | Gửi đánh giá 5 sao kèm lời nhận xét | Lưu thành công vào bảng ratings và cập nhật bộ nhớ AI |
| **TC-13** | My Trips | Vào trang `/my-trips` | Hiển thị danh sách các chuyến đi đã tạo của đúng tài khoản đó |
| **TC-14** | Chia sẻ link | Mở link `/s/:shareToken` trên trình duyệt ẩn danh | Xem được lịch trình ở chế độ chỉ đọc mà không cần đăng nhập |
| **TC-15** | Người dùng cũ | Đăng nhập lại với tài khoản đã có lịch sử | Hiển thị lời chào thân thiện và nút điền trước sở thích cũ |

---

## 9. THIẾT KẾ TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX DESIGN SYSTEM)

### 9.1. Bảng Màu Sắc Chủ Đạo (Color Palette)
- **Màu Nhận Diện Chính (Brand Primary):** Màu Đỏ Hoa Phượng Sài Gòn (Rose Red) kết hợp Sắc Cam Nắng Nhiệt Đới (Amber Orange), tượng trưng cho sự năng động, nồng hậu và ẩm thực phong phú của TP.HCM.
- **Màu Công Nghệ & Tin Cậy (Accent Indigo):** Màu Xanh Chàm Hiện Đại (Indigo), tượng trưng cho trí tuệ nhân tạo, sự chính xác và công nghệ số.
- **Màu Nền & Bề Mặt (Neutral Background):** Gam màu Trắng Tinh và Ghi Sáng (Slate 50), tạo cảm giác thoáng đãng, dễ đọc trên cả thiết bị di động và máy tính.
- **Màu Cảnh Báo & Dự Phòng:** Màu Xanh Trời Mưa (Sky Blue) dành cho kịch bản thời tiết và Màu Vàng Cảnh Báo (Amber) dành cho kịch bản kẹt xe giờ cao điểm.

### 9.2. Bố Cục Không Gian Làm Việc Chính (Planner Page Layout)
- **Khu vực Tiêu đề & Thông báo Người dùng quen:** Hiển thị lời chào cá nhân hóa, thanh công cụ kích hoạt kịch bản dự phòng thời tiết, nút đồng bộ Google Calendar và nút đánh giá sao.
- **Cột Trái (Timeline Chi Tiết):** Chiếm 60% không gian màn hình trên máy tính. Hiển thị danh sách các ngày được phân chia theo thẻ tab, mỗi ngày gồm các hoạt động xếp theo thứ tự mốc giờ từ sáng đến tối. Mỗi thẻ hoạt động có nút đổi địa điểm và huy hiệu điểm dự phòng khi mưa.
- **Cột Phải (Bản Đồ & Trợ Lý Chat AI):** Chiếm 40% không gian màn hình trên máy tính. Phía trên là Bản đồ tương tác TP.HCM với các marker có thể nhấn chọn; phía dưới là Khung chat trò chuyện trực tiếp cùng trợ lý AI.

---

## 10. PHÂN KỲ PHÁT TRIỂN & TIẾN ĐỘ THỰC HIỆN (4 TUẦN NƯỚC RÚT)

- **Tuần 1: Thiết lập Nền tảng, Cơ sở Dữ liệu & Xác thực (Sprint 1)**
  - Xây dựng cấu trúc thư mục Client và Server.
  - Khởi tạo cơ sở dữ liệu các bảng Users, Preferences, Trips, Activities, Ratings.
  - Hiện thực luồng Đăng ký, Đăng nhập, cấp phát JWT và chặn truy cập trái phép.
  - Thiết kế Landing Page giới thiệu và Form khảo sát 8 tiêu chí TP.HCM.
- **Tuần 2: Lõi Trí Tuệ Nhân Tạo, Đổi Địa Điểm & Bản Đồ Tương Tác (Sprint 2)**
  - Tích hợp System Instruction cho Gemini AI và bộ dữ liệu 50+ địa điểm TP.HCM.
  - Hiện thực trọn vẹn Luồng tương tác 4 bước (Form ➔ Gợi ý ➔ Xác nhận ➔ Chi tiết).
  - Xây dựng tính năng Đổi địa điểm (Swap Place) với 2-3 lựa chọn thay thế.
  - Hiện thực Bản đồ tương tác hiển thị marker và thẻ Mini-Map trong khung chat.
- **Tuần 3: Google Calendar, Kịch bản Dự phòng & Đánh giá Chất lượng (Sprint 3)**
  - Xây dựng module tạo sự kiện Google Calendar có nhắc nhở trước 30 phút.
  - Hiện thực Kịch bản dự phòng khi trời mưa và cảnh báo kẹt xe giờ cao điểm (17h-19h).
  - Xây dựng trang My Trips, cơ chế tạo liên kết chia sẻ chỉ xem (/s/:shareToken).
  - Xây dựng modal chấm điểm 1-5 sao và cập nhật phản hồi vào bộ nhớ AI.
- **Tuần 4: Cá nhân hóa Người dùng quay lại, Kiểm thử & Đóng gói Bảo vệ (Sprint 4)**
  - Hiện thực cơ chế nhận diện người dùng cũ, chào mừng đích danh và điền trước form.
  - Chạy toàn bộ 15 kịch bản kiểm thử (Test Cases), tối ưu hiệu năng giao diện.
  - Soạn thảo Slide thuyết trình 5 phút và video demo theo chuẩn yêu cầu giảng viên.

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

## 12. KỊCH BẢN THUYẾT TRÌNH & BẢO VỆ ĐỒ ÁN (LIVE PITCH & Q&A DEFENSE)

### 12.1. Kịch Bản Trình Diễn Trực Tiếp Trong 5 Phút
- **Phút 0 - 1 (Vấn đề & Đăng nhập bắt buộc):** Trình bày thực trạng du khách bị kẹt xe và gián đoạn lịch trình vì mưa tại TP.HCM. Trình diễn trang Landing Page dành cho khách, sau đó bấm nút "Điền tài khoản test 1 click" để đăng nhập, chứng minh Yêu cầu 1: Bắt buộc đăng nhập để hệ thống nhận diện cá nhân.
- **Phút 1 - 2 (Lời chào người cũ & Form 8 tiêu chí):** Hệ thống nhận diện người dùng quay lại, hiển thị lời chào "Chào mừng trở lại!" và bấm nút "Điền trước sở thích cũ". Giải thích ý nghĩa của 8 tiêu chí khảo sát và gửi yêu cầu để AI đưa ra ý tưởng tổng quan ở Bước 2.
- **Phút 2 - 3 (Luồng 4 bước & Lịch trình chi tiết):** Cho hội đồng thấy AI gợi ý ý tưởng trước, sau đó bấm nút "Tôi đồng ý" để sinh lịch trình chi tiết từng giờ. Giới thiệu Bản đồ tương tác TP.HCM đồng bộ với timeline và khung chat AI có thẻ Mini-Map card.
- **Phút 3 - 4 (Tính năng Đổi địa điểm & Kịch bản dự phòng):** Bấm nút "Đổi địa điểm" tại một chặng, cho thấy AI lập tức đưa ra 3 phương án thay thế cùng quận. Tiếp tục bấm nút "Kích hoạt Trời Mưa", chứng minh toàn bộ các điểm ngoài trời tự động chuyển sang bảo tàng và workshop trong nhà.
- **Phút 4 - 5 (Đột phá Google Calendar & Đánh giá AI):** Bấm nút "Đồng Bộ Google Calendar", cho thấy các sự kiện được tạo tự động với chuông báo thức trước 30 phút. Cuối cùng, thực hiện đánh giá 5 sao cho AI và mở link chia sẻ chỉ xem (/s/:token) trên tab ẩn danh.

### 12.2. Bộ Câu Hỏi Vấn Đáp Thường Gặp Của Hội Đồng & Hướng Trả Lời Chuẩn
1. **Câu hỏi:** *Vì sao nhóm lại bắt buộc người dùng phải đăng nhập thay vì cho dùng thử tự do như các web khác?*  
   **Trả lời:** Bắt buộc đăng nhập là yêu cầu then chốt của giảng viên nhằm giúp AI có thể lưu trữ lịch sử trò chuyện, xây dựng hồ sơ thói quen du lịch dài hạn (Travel Profile) và tự động điền trước form cho người dùng quay lại. Nếu để khách thao tác vô danh, AI sẽ không có ngữ cảnh để cá nhân hóa chính xác.
2. **Câu hỏi:** *Hệ thống giải quyết bài toán thời tiết và kẹt xe tại TP.HCM như thế nào?*  
   **Trả lời:** Hệ thống cài đặt sẵn 2 kịch bản dự phòng: Khi trời mưa, thuật toán tự động hoán đổi các điểm ngoài trời sang các bảo tàng, workshop có mái che cùng quận; Trong khung giờ cao điểm 17h-19h, hệ thống áp dụng kỹ thuật gom cụm (Clustering) để sắp xếp các hoạt động ăn tối/nghỉ ngơi gần nhau dưới 1.5 km, hạn chế tối đa việc di chuyển xuyên trục đường đông đúc.
3. **Câu hỏi:** *Tính năng đồng bộ Google Calendar hoạt động ra sao và mang lại lợi ích gì?*  
   **Trả lời:** Hệ thống chuyển đổi từng hoạt động thành sự kiện chuẩn trên Google Calendar có thời gian bắt đầu, kết thúc, địa chỉ thực tế và thông báo nhắc trước 30 phút. Người dùng có thể nhấn 1-click để lưu ngay vào lịch trên điện thoại, biến lịch trình tĩnh thành trợ lý nhắc việc thực tế.
4. **Câu hỏi:** *Nếu mất mạng hoặc hết hạn mức gọi Google Gemini API thì web có bị lỗi không?*  
   **Trả lời:** Không. Nhóm đã xây dựng cơ chế Fallback Engine với cơ sở dữ liệu nội bộ gồm hơn 50 địa điểm thực tế tại các quận TP.HCM. Khi API gặp sự cố, hệ thống tự động kích hoạt bộ sinh lịch trình dự phòng mà không làm gián đoạn trải nghiệm người dùng.

---

## 13. CHECKLIST NGHIỆM THU ĐỒ ÁN (DEFINITION OF DONE)

- [x] Có đầy đủ 8 màn hình giao diện chuẩn theo thiết kế.
- [x] Chặn hoàn toàn khách chưa đăng nhập, bắt buộc xác thực tài khoản qua Bearer JWT.
- [x] Form khảo sát tiếp nhận đầy đủ 8 tiêu chí chuẩn xác cho TP.HCM.
- [x] Luồng tương tác AI tuân thủ đúng 4 bước: Khảo sát ➔ Gợi ý ➔ Xác nhận ➔ Chi tiết.
- [x] Tính năng Đổi địa điểm (Swap Place) hiển thị đúng 2-3 gợi ý thay thế cùng khu vực.
- [x] Bản đồ tương tác TP.HCM hiển thị marker có tọa độ thật và thẻ Mini-Map trong khung chat.
- [x] Kịch bản dự phòng trời mưa tự động chuyển đổi điểm ngoài trời sang điểm trong nhà.
- [x] Kịch bản giờ cao điểm 17h-19h gom cụm địa điểm và đưa ra cảnh báo giao thông.
- [x] Tính năng đồng bộ Google Calendar tạo sự kiện kèm thông báo nhắc trước 30 phút.
- [x] Trang My Trips lưu trữ danh sách hành trình và tạo link chia sẻ chỉ xem an toàn.
- [x] Modal chấm điểm 1-5 sao lưu thành công nhận xét vào cơ sở dữ liệu.
- [x] Hệ thống nhận diện người dùng quen, hiển thị lời chào đích danh và điền trước form.
- [x] Loại bỏ hoàn toàn tùy chọn nhân vật / giọng điệu AI (persona) để đảm bảo tính khách quan.
- [x] Hệ thống khởi chạy 1-click trơn tru thông qua file batch cục bộ mà không cần cài đặt phức tạp.

---

## 14. LỘ TRÌNH PHÁT TRIỂN TƯƠNG LAI (FUTURE ROADMAP)

1. **Mở rộng phạm vi địa lý:** Kết nối các tour liên tuyến từ TP.HCM đi các tỉnh thành lân cận như Cần Giờ, Tây Ninh, Vũng Tàu, Đồng bằng Sông Cửu Long.
2. **Tích hợp cổng thanh toán & Đặt chỗ trực tuyến:** Kết nối API đặt phòng khách sạn, vé xe buýt đường sông (Saigon Waterbus) và vé tham quan di tích trực tiếp trên lịch trình.
3. **Ứng dụng di động Native (React Native / Flutter):** Bổ sung tính năng định vị GPS thời gian thực, tự động phát hiện du khách đến gần địa điểm để phát audio thuyết minh tự động.
4. **Cộng đồng chia sẻ lịch trình (Social Travel Hub):** Cho phép du khách bình chọn, bình luận và nhân bản các lịch trình du lịch xuất sắc nhất của cộng đồng.
