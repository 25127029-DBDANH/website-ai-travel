> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# 📐 10b. Thiết kế Giao diện & Wireframes v3 (Khớp 7 Yêu cầu Mới)

## Màn hình 1: Landing Page Giới thiệu (Dành cho Khách vãng lai)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 📍 HCMC Travel AI                        [Về dự án]  [Đăng nhập] [Đăng ký] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│            ✈️ TRỢ LÝ AI LÊN LỊCH TRÌNH DU LỊCH TP. HỒ CHÍ MINH         │
│     Khám phá Sài Gòn đúng gu, tối ưu đường đi, không lo mưa ngập       │
│                                                                        │
│    ┌───────────────────────────┐    ┌───────────────────────────────┐  │
│    │  🔐 Đăng nhập để sử dụng  │    │  ✨ 7 Tính năng Đột phá       │  │
│    │  Trực quan 4 Chế độ,       │    │  • Lịch trình chuẩn từng giờ  │  │
│    │  Lịch trình bản đồ,       │    │  • Đổi địa điểm linh hoạt     │  │
│    │  Đồng bộ Google Calendar! │    │  • Dự phòng khi trời mưa      │  │
│    │  [ 👉 Bắt đầu ngay ]      │    │  • Đồng bộ Google Calendar    │  │
│    └───────────────────────────┘    └───────────────────────────────┘  │
│                                                                        │
│   (Khách chỉ xem thông tin giới thiệu; bấm bắt đầu sẽ mở Auth Modal)   │
└────────────────────────────────────────────────────────────────────────┘
```

## Màn hình 2: Bảng Nhập Yêu Cầu Đầy đủ 8 Tiêu chí (Sau Đăng nhập)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 📍 HCMC Travel AI               ☀️/🌙   [My Trips]  [👤 Nguyễn Văn A ▾] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ 🧭 Chào mừng trở lại, Văn A! (Đã tự động điền sở thích chuyến trước)   │
│                                                                        │
│ ┌─ BẢNG THIẾT KẾ CHUYẾN ĐI TP. HỒ CHÍ MINH ──────────────────────────┐ │
│ │ 1. Số ngày: [ 2 ngày  -/+ ]      2. Khu vực: [ Quận 1, Quận 3    ▼]│ │
│ │ 3. Ngân sách: [ 3,000,000 VND ]  4. Số người: [ 👥 Nhóm bạn (3)  ▼]│ │
│ │ 5. Phương tiện: [ 🛵 Grab/Xe máy ▼] 6. Nhịp độ: [ ⚖️ Cân bằng     ▼]│ │
│ │ 7. Sở thích: [🍜 Ẩm thực ✓] [🏛️ Di tích ✓] [☕ Cà phê ✓] [🛍️ Chợ]   │ │
│ │ 8. Ghi chú: [ Không ăn cay, thích quán cà phê không gian yên tĩnh ] │ │
│ │                                                                    │ │
│ │                  [ 🚀 LÊN KẾ HOẠCH VỚI AI ]                         │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

## Màn hình 3: Bước 2 & 3 - AI Gợi Ý Định Hướng & Người Dùng Duyệt
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🤖 HCMC Travel AI: Gợi ý định hướng chuyến đi của bạn                  │
│                                                                        │
│ "Dựa trên yêu cầu của bạn, tôi đề xuất concept du lịch 2 ngày như sau: │
│  • Ngày 1: Quận 1 Di sản & Cà phê cổ kính (Dinh Độc Lập, Bảo tàng,...) │
│  • Ngày 2: Quận 3 Ẩm thực ngõ hẻm & Phố ốc đêm Tân Định               │
│ Bạn có đồng ý với định hướng này để tôi tạo lịch trình chi tiết không?"│
│                                                                        │
│ [ ✅ Đồng ý & Tạo lịch trình chi tiết ]    [ ✍️ Yêu cầu điều chỉnh lại ]│
└────────────────────────────────────────────────────────────────────────┘
```

## Màn hình 4: Dashboard 4 Chế Độ Trải Nghiệm (2 Khung hình Song song)
`
┌────────────────────────────────────────────────────────────────────────┐
│ 🧭 Sài Gòn Guide — TP. Hồ Chí Minh            [🌧️ Trời mưa] [⚠️ Giờ cao điểm]│
│ [Khám phá Sài Gòn 3 ngày]  ·  3 ngày  ·  5.000.000 đ                   │
├────────────────────────────────────────────────────────────────────────┤
│ 🔵 1. Lịch trình Timeline  🟢 2. Đi thực tế  🟠 3. Chi tiêu  🟣 4. Tổng kết │
├───────────────────────────────────┬────────────────────────────────────┤
│ 🗺️ KHUNG 1: BẢN ĐỒ TƯƠNG TÁC       │ 📋 KHUNG 2: LỊCH TRÌNH 3 TẦNG     │
│ ┌─ Leaflet Maps (WGS84) ────────┐ │                                    │
│ │ [✓ Dinh Độc Lập] -> [2. Phở]   │ │ ┌─ Chặng 1: 08:30 - 10:15 ─── ₫65k─┐
│ │ (Marker đổi tích xanh khi đi)  │ │ │ Dinh Độc Lập (Quận 1) (100% width)│
│ │                                │ │ │ Di tích lịch sử kiến trúc đặc sắc│
│ │                                │ │ │ [✓ Đã hoàn tất] [Xem chi tiết]    │
│ └────────────────────────────────┘ │ └──────────────────────────────────┘
│                                   │ ┌─ Chặng 2: 12:00 - 13:30 ─── ₫95k─┐
│                                   │ │ Phở Hoa Pasteur (Quận 3)         │
│                                   │ │ Ẩm thực truyền thống lâu đời     │
│                                   │ │ [Accept Chốt] [🔄 Đổi điểm]      │
│                                   │ └──────────────────────────────────┘
│ 💰 Ngân sách: ₫991,000 / ₫5,000,000│ [ 🔗 Chia sẻ ]  [ 📅 Đồng bộ Cal ] │
└───────────────────────────────────┴────────────────────────────────────┘
`
