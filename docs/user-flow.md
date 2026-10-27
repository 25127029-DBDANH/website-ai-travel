# 🗺️ USER FLOW: HCMC AI TRAVEL PLANNER (7 YÊU CẦU MỚI)

---

## 1. SƠ ĐỒ LUỒNG TỔNG THỂ (MERMAID USER FLOW)

```mermaid
flowchart TD
    Start([Khách mở Website]) --> CheckAuth{Đã đăng nhập?}

    %% Nhánh Khách vãng lai
    CheckAuth -- Chưa --> LandingPage[Xem Landing Page Giới thiệu tính năng]
    LandingPage --> ClickAuth[Bấm Đăng nhập / Đăng ký]
    ClickAuth --> AuthModal[Đăng nhập Username/Password hoặc Google Sign-In]
    AuthModal --> LoginSuccess[Đăng nhập thành công -> Cấp JWT Token]

    %% Nhánh Người dùng đã xác thực
    CheckAuth -- Rồi --> CheckReturning{Người dùng cũ hay mới?}
    LoginSuccess --> CheckReturning

    %% Người dùng mới
    CheckReturning -- Người dùng mới --> WelcomeNew[Lời chào thành viên mới]
    WelcomeNew --> EmptyForm[Bảng nhập yêu cầu 8 trường trống]

    %% Người dùng cũ
    CheckReturning -- Người dùng cũ quay lại --> WelcomeBack["Chào mừng trở lại!"\nHiển thị lịch sử cũ]
    WelcomeBack --> PreFilledForm[Form 8 trường ĐIỀN SẴN sở thích cũ]

    %% Luồng tạo lịch trình 4 bước
    EmptyForm --> FillForm[Nhập/Chỉnh sửa 8 tiêu chí TP.HCM]
    PreFilledForm --> FillForm
    FillForm --> SubmitForm[Bấm 'Lên kế hoạch với AI']

    SubmitForm --> Step2AI[BƯỚC 2: AI đưa GỢI Ý ĐỊNH HƯỚNG CỤ THỂ\nConcept, Điểm nhấn, Phân bổ khu vực]
    Step2AI --> UserReviewChoice{Người dùng đồng ý?}

    UserReviewChoice -- Cần chỉnh lại --> AdjustRequest[Gõ yêu cầu chỉnh sửa trong Chat]
    AdjustRequest --> Step2AI

    UserReviewChoice -- Đồng ý --> Step4Detailed[BƯỚC 4: AI sinh LỊCH TRÌNH CHI TIẾT\nTimeline từng giờ + Bản đồ + Cước Grab Haversine]

    %% Tương tác sau khi có lịch trình
    Step4Detailed --> MainWorkspace[Màn hình Workspace Lịch trình + Chat + Bản đồ]

    MainWorkspace --> ActionSwap{Người dùng muốn đổi điểm?}
    ActionSwap -- Có --> ClickSwap[Bấm 'Đổi địa điểm này']
    ClickSwap --> AISwapOptions[AI đưa 2-3 địa điểm thay thế tương đương]
    AISwapOptions --> SelectOption[Người dùng chọn 1 phương án]
    SelectOption --> Step4Detailed

    ActionSwap -- Không --> ActionContingency{Gặp sự cố / Trời mưa?}
    ActionContingency -- Có --> ClickContingency[Bấm 'Trời mưa' / 'Kẹt xe' / 'Đổi chỗ']
    ClickContingency --> AIContingency[AI kích hoạt Kịch bản dự phòng\nThay điểm trong nhà, né kẹt xe]
    AIContingency --> Step4Detailed

    ActionContingency -- Không --> ActionReview{Xem đánh giá AI?}
    ActionReview -- Có --> ClickReview[Bấm 'AI Đánh giá lịch trình']
    ClickReview --> ShowReview[AI chấm điểm & đưa Insider Tips bản địa]
    ShowReview --> MainWorkspace

    ActionReview -- Không --> ActionCalendar{Đồng bộ Google Calendar?}
    ActionCalendar -- Có --> ClickCalendar[Bấm 'Đồng bộ Google Calendar']
    ClickCalendar --> OAuthCalendar{Đã cấp quyền Calendar?}
    OAuthCalendar -- Chưa --> GrantPerm[Cấp quyền Google Calendar Scope]
    GrantPerm --> PushCalendar[Tạo sự kiện chi tiết lên Google Calendar]
    OAuthCalendar -- Rồi --> PushCalendar
    PushCalendar --> CalendarSuccess[Thông báo đồng bộ thành công + Link xem Calendar]
    CalendarSuccess --> MainWorkspace

    ActionCalendar -- Không --> ActionShare[Bấm 'Chia sẻ' -> Lấy link chỉ xem /s/:token]
```

---

## 2. MÔ TẢ CHI TIẾT TỪNG GIAI ĐOẠN

### Giai đoạn 1: Tiếp cận & Xác thực (Authentication Gate)
- **Khách truy cập:** Chỉ thấy giao diện giới thiệu (Hero banner, tính năng nổi bật, phản hồi mẫu). Mọi thao tác tạo lịch trình đều kích hoạt modal yêu cầu đăng nhập.
- **Xác thực:** Người dùng chọn đăng nhập bằng tài khoản hoặc Google. Sau khi có JWT, ứng dụng tự động kiểm tra số lượng chuyến đi cũ.

### Giai đoạn 2: Tiếp nhận yêu cầu (8 tiêu chí TP.HCM)
- **Người dùng mới:** Tiếp nhận form trống, có placeholder hướng dẫn rõ ràng.
- **Người dùng cũ:** Hệ thống tự động nạp từ CSDL các thông tin quen thuộc (Quận yêu thích, phương tiện hay đi, nhịp độ chuyến đi, số người) vào form. Người dùng chỉ cần duyệt nhanh.

### Giai đoạn 3: Luồng tương tác AI 4 bước
- Thay vì sinh ngay lịch trình 100% chi tiết dễ gây sai lệch ý muốn, AI trước tiên đưa ra **bản tóm tắt định hướng (Trip Concept)** để người dùng xác nhận.
- Khi người dùng đồng ý, AI mới tiến hành truy vấn Google Places và ghép nối lộ trình chi tiết.

### Giai đoạn 4: Vận hành & Dự phòng thông minh
- Khung nhìn chia đôi (Split-View): Bên trái là đàm thoại AI có nhúng bản đồ nhỏ; bên phải là Timeline dọc và Google Maps toàn cảnh.
- Xử lý đổi địa điểm mượt mà với 2-3 gợi ý cụ thể.
- Kịch bản thời tiết (mưa/kẹt xe) giúp thay đổi lộ trình tức thì chỉ bằng một thao tác chạm.

### Giai đoạn 5: Đóng gói & Lan tỏa giá trị (Calendar & Share)
- Đưa toàn bộ các chặng đi vào Google Calendar để nhận thông báo nhắc nhở tự động trên điện thoại.
- Yêu cầu AI chấm điểm chuyên gia và xuất link chia sẻ cho bạn bè cùng xem.
