# 🗺️ USER FLOW: HCMC AI TRAVEL PLANNER (SÀI GÒN GUIDE)
## QUY TRÌNH TRẢI NGHIỆM NGƯỜI DÙNG KHÉP KÍN 6 GIAI ĐOẠN

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
    WelcomeNew --> EmptyForm[Form nhập yêu cầu 8 tiêu chí chuẩn]

    %% Người dùng cũ
    CheckReturning -- Người dùng cũ quay lại --> WelcomeBack["Chào mừng trở lại!"\nHiển thị lịch sử cũ]
    WelcomeBack --> PreFilledForm[Form 8 trường ĐIỀN SẴN sở thích cũ]

    %% Luồng AI tạo lịch trình
    EmptyForm --> FillForm[Nhập/Chỉnh sửa 8 tiêu chí TP.HCM]
    PreFilledForm --> FillForm
    FillForm --> SubmitForm[Bấm 'Tạo lịch trình AI Sài Gòn ngay']

    SubmitForm --> AIEngine[AI Engine phân tích sở thích & ngân sách\nTruy vấn Places Data + Tọa độ + Cước xe 3 hãng]
    AIEngine --> MainDashboard[Chuyển hướng vào Dashboard 4 Chế Độ Tương Tác]

    %% 4 Chế độ làm việc
    MainDashboard --> Tab1[TAB 1: LỊCH TRÌNH TIMELINE\nKhung 1 Bản đồ Leaflet song song Khung 2 Timeline 3 tầng]
    MainDashboard --> Tab2[TAB 2: ĐI THỰC TẾ COMPANION\nHero chỉ chặng, Chỉ đường, Đặt xe Grab/Xanh/Be, Check-in]
    MainDashboard --> Tab3[TAB 3: SỔ CHI TIÊU & DI CHUYỂN\nVé, Ẩm thực & Cước xe từng chặng, Sửa tiền inline]
    MainDashboard --> Tab4[TAB 4: TỔNG KẾT CHUYẾN ĐI\n4 KPIs, Cơ cấu tiền, Album ảnh, Xuất Story Card Canvas]

    %% Tương tác Tab 1
    Tab1 --> ActionAccept[Bấm 'Accept' -> Chốt điểm tham quan]
    Tab1 --> ActionSwap{Muốn đổi địa điểm?}
    ActionSwap -- Có --> ClickSwap[Bấm 'Đổi địa điểm' -> Mở Modal Smart Swap]
    ClickSwap --> SelectSwap[Chọn 1 trong 3-4 điểm thay thế tương đương]
    SelectSwap --> Tab1

    Tab1 --> ActionContingency{Thời tiết mưa / Kẹt xe?}
    ActionContingency -- Có --> ClickContingency[Bấm 'Trời mưa Sài Gòn' / 'Giờ cao điểm']
    ClickContingency --> AIAdapt[AI tự động đổi sang điểm có mái che / cộng đệm +20p]
    AIAdapt --> Tab1

    %% Tương tác Tab 2
    Tab2 --> ActionRide[Bấm 'Đặt xe di chuyển' -> Chọn Grab / Xanh SM / Be mở app]
    Tab2 --> ActionCheckin[Bấm 'Chụp ảnh Check-in' -> Đánh dấu ✓ hoàn thành chặng]
    ActionCheckin --> SyncVisited[Bản đồ Khung 1 đổi pin thành tích xanh ✓ & Khóa nút đổi điểm]
    SyncVisited --> Tab2
    Tab2 --> ActionFinish[Bấm 'Hoàn thành chuyến đi']
    ActionFinish --> Tab4

    %% Tương tác Tab 3 & Tab 4
    Tab3 --> ActionEditFare[Nhấp số tiền cước xe -> Tự điền cước thực chi lưu vào sổ]
    Tab4 --> ActionExportCard[Bấm 'Xuất Thẻ ảnh kỷ niệm' -> Tải ảnh Story Card 9:16]
    Tab1 --> ActionCalendar[Bấm 'Đồng bộ Google Calendar' hoặc tải file .ICS]
    Tab1 --> ActionShare[Bấm 'Chia sẻ' -> Tạo liên kết công khai /s/:token]
```

---

## 2. MÔ TẢ CHI TIẾT TỪNG GIAI ĐOẠN TRẢI NGHIỆM

### Giai đoạn 1: Tiếp cận & Xác thực Danh tính (Authentication Gate)
- **Khách truy cập:** Xem giao diện giới thiệu Landing Page (Hero 3D, danh mục điểm đến, review). Khách đăng nhập qua tài khoản hoặc Google OAuth 2.0.
- **Xác thực an toàn:** Hệ thống cấp phát JWT Token và nạp thông tin người dùng.

### Giai đoạn 2: Khảo sát Nhu cầu Du lịch (8 Tiêu chí Đặc thù TP.HCM)
- Người dùng tương tác trực tiếp với **Form khảo sát thông minh**:
  1. Số ngày (1 - 14 ngày)
  2. Khu vực / Quận ưu tiên tại TP.HCM
  3. Ngân sách dự trù (VND)
  4. Sở thích cốt lõi (ẩm thực đường phố, di tích lịch sử, cafe specialty, mua sắm...)
  5. Đối tượng đi cùng (Solo, Cặp đôi, Nhóm bạn, Gia đình)
  6. Phương tiện di chuyển ưu tiên
  7. Nhịp độ chuyến đi (Thong thả, Cân bằng, Năng động)
  8. Ghi chú cá nhân đặc biệt.
- **Người dùng cũ:** Hệ thống tự động điền sẵn (pre-fill) các sở thích quen thuộc từ chuyến trước.

### Giai đoạn 3: AI Engine Tối ưu hóa & Đưa vào Dashboard
- Người dùng bấm *"Tạo lịch trình AI Sài Gòn ngay"*, AI Engine (Google Gemini 2.5 Flash) kết hợp thuật toán Haversine và cơ sở dữ liệu địa điểm để tính toán lộ trình tối ưu nhất.
- Hệ thống điều hướng tức thì vào **Màn hình Chuyến đi (`/trip/:id`)** với **4 Chế độ Trải nghiệm** trực quan mà không cần đàm thoại qua khung lịch trình gõ chữ.

### Giai đoạn 4: Tinh chỉnh Lịch trình Trực quan (Tab 1: Lịch trình Timeline)
- **Bố cục 2 Khung hình Song song:**
  - *Khung 1 (Bản đồ tương tác):* Bản đồ Leaflet vẽ lộ trình các chặng [1, 2, 3, 4] trong ngày.
  - *Khung 2 (Lịch trình 3 tầng):* Hiển thị thời gian biểu, tên địa điểm không bao giờ bị đè chữ, nút *Accept* chốt điểm, và nút *Đổi địa điểm (AI Smart Swap)* mở Modal chọn 3-4 điểm thay thế.
- **Kịch bản thích ứng:** Bấm nút *[Trời mưa Sài Gòn]* hoặc *[Giờ cao điểm]* để AI tự động chuyển các điểm ngoài trời sang điểm trong nhà có mái che hoặc cộng thời gian đệm kẹt xe.

### Giai đoạn 5: Đồng hành Thực địa Ngoài đường (Tab 2: Chế độ Đi thực tế Companion)
- **Thẻ Hero:** Chỉ đường đến chặng kế tiếp, khoảng cách và thời lượng.
- **Gọi xe công nghệ 3 hãng:** Bấm nút mở Modal hiển thị cước ước tính và deep-link mở thẳng ứng dụng **Grab**, **Xanh SM** (xe điện VinFast), hoặc **Be**.
- **Check-in chụp ảnh:** Du khách bấm chụp ảnh tại điểm đến -> Chặng chuyển sang trạng thái `[✓ Đã hoàn thành]`, Bản đồ Khung 1 tự động đổi pin thành dấu tích xanh `✓`, và nút đổi điểm bị khóa logic.

### Giai đoạn 6: Quản lý Chi tiêu, Đóng gói Kỷ niệm & Lan tỏa (Tab 3 & Tab 4)
- **Tab 3 (Sổ chi tiêu):** Quản lý chi phí vé, ẩm thực và **cước xe từng chặng**, cho phép khách tự do nhấp sửa cước xe thực chi trực tiếp (*inline editing*).
- **Tab 4 (Tổng kết chuyến đi):** Thống kê 4 KPI, phân bổ 3 nhóm tiền, album ảnh check-in thực tế.
- **Xuất Thẻ ảnh kỷ niệm (Story Card):** Tự động vẽ đồ họa Canvas tổng kết chuyến đi (tỷ lệ 9:16) để tải về máy chia sẻ Facebook/Instagram.
- **Đồng bộ lịch:** Tải file `.ICS` hoặc đẩy lịch lên Google Calendar.
