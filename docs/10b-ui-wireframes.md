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
│    │  Trải nghiệm Chat AI,     │    │  • Lịch trình chuẩn từng giờ  │  │
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

## Màn hình 4: Workspace Lịch trình Chi tiết, Bản đồ & Google Calendar
```
┌────────────────────────────────────────────────────────────────────────┐
│ 📍 HCMC Travel AI            [🌧️ Đổi điểm vì mưa] [⭐ AI Đánh giá] [📅 Calendar]│
├───────────────────────────────────┬────────────────────────────────────┤
│ 💬 CHAT VỚI TRỢ LÝ AI             │ 📋 TIMELINE & BẢN ĐỒ TƯƠNG TÁC     │
│                                   │                                    │
│ 🤖 Lịch trình Day 1 của bạn đã sẵn│ ┌─ Google Maps tương tác ────────┐ │
│    sàng! Dưới đây là bản đồ lộ    │ │ [1. Dinh Độc Lập] -> [2. Phở]  │ │
│    trình tóm tắt:                 │ └────────────────────────────────┘ │
│ ┌─ [In-chat Map Card] ──────────┐ │                                    │
│ │ [Bản đồ mini 3 điểm chặng]    │ │ ● 08:30: 🏛️ Dinh Độc Lập         │
│ └───────────────────────────────┘ │   ⭐ 4.6 · ₫40,000 · Q.1           │
│                                   │   [🔄 Đổi địa điểm này]            │
│ 👤 Swap quán ăn trưa sang món bún │                                    │
│ 🤖 Dưới đây là 3 lựa chọn đổi:   │ ● 12:00: 🍜 Phở Hòa Pasteur        │
│    1. Bún bò Gánh Q.1             │   ⭐ 4.4 · ₫75,000 · Q.3           │
│    2. Bún mọc Thanh Mai Q.1       │   [🔄 Đổi địa điểm này]            │
│    [Chọn số 1] [Chọn số 2]        │                                    │
│                                   │ 💰 Ngân sách: ₫1.85M / ₫3M (62%)   │
│ [ Nhập tin nhắn...           ▶ ]  │ [ 🔗 Chia sẻ ]  [ 📅 Đẩy lên Cal ] │
└───────────────────────────────────┴────────────────────────────────────┘
```
