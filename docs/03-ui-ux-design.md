# 🎨 03. Hệ Thống Thiết Kế Giao Diện & Trải Nghiệm (UI/UX Design System)

> **Tài liệu hợp nhất:** Gộp từ `10a-ui-design-system.md`, `10b-ui-wireframes.md` và `10c-ui-motion-settings.md`.

## Mục lục
- 1. Design System (Màu sắc, Typography, Component Tokens)
- 2. Wireframes & Bố cục màn hình
- 3. Hiệu ứng chuyển động (Motion) & Cài đặt giao diện

---

## 10. UI/UX Design

### 10.1. Design System

#### Bảng màu (Color Palette)

| Token | Light Mode | Dark Mode | Sử dụng |
| --- | --- | --- | --- |
| Primary | `#2563EB` (Blue 600) | `#60A5FA` (Blue 400) | Nút chính, link, focus ring, thẻ lịch trình active |
| Accent | `#F97316` (Orange 500) | `#FB923C` (Orange 400) | CTA nổi bật ("Plan My Trip"), highlight giá tiền |
| Background | `#FFFFFF` | `#111827` (Gray 900) | Nền trang |
| Surface | `#F9FAFB` (Gray 50) | `#1F2937` (Gray 800) | Nền card, panel |
| AI Bubble | `#EEF2FF` (Indigo 50) | `#1E293B` (Slate 800) | Nền tin nhắn AI |
| Text Primary | `#111827` (Gray 900) | `#F9FAFB` (Gray 50) | Tiêu đề, nội dung chính |
| Text Secondary | `#6B7280` (Gray 500) | `#9CA3AF` (Gray 400) | Mô tả phụ, timestamp |
| Border | `#E5E7EB` (Gray 200) | `#374151` (Gray 700) | Viền card, divider |
| Success | `#10B981` (Emerald 500) | `#34D399` (Emerald 400) | Under budget, thành công |
| Warning | `#F59E0B` (Amber 500) | `#FBBF24` (Amber 400) | Gần hết budget, cảnh báo |
| Error | `#EF4444` (Red 500) | `#F87171` (Red 400) | Lỗi, over budget |

> **Ý đồ thiết kế**: Blue gợi sự tin tưởng + khám phá, Orange mang hơi ấm Việt Nam. Tổ hợp tương tự Airbnb (coral + neutral) nhưng chuyên nghiệp hơn cho AI tool.

#### Category Colors (dùng cho timeline)

| Category | Màu | Icon |
| --- | --- | --- |
| 🍜 Food/Restaurant | `#F59E0B` (Amber) | 🍜 |
| 🏛️ Sightseeing | `#3B82F6` (Blue) | 🏛️ |
| ☕ Café / Rest | `#8B5CF6` (Purple) | ☕ |
| 🛍️ Shopping | `#EC4899` (Pink) | 🛍️ |
| 🌿 Nature / Park | `#10B981` (Green) | 🌿 |
| 🎭 Entertainment | `#F97316` (Orange) | 🎭 |

#### Typography

| Thành phần | Font | Weight | Size | Ghi chú |
| --- | --- | --- | --- | --- |
| Heading H1 | Inter | 700 (Bold) | 2rem (32px) | Tiêu đề trang |
| Heading H2 | Inter | 700 | 1.5rem (24px) | Tiêu đề section |
| Heading H3 | Inter | 600 (Semi) | 1.25rem (20px) | Tiêu đề card |
| Body | Inter | 400 (Regular) | 1rem (16px) | Nội dung, `line-height: 1.6` |
| Timeline desc | Inter | 400 | 0.875rem (14px) | Mô tả chi tiết địa điểm |
| Caption / Label | Inter | 500 (Medium) | 0.75rem (12px) | Timestamp, label phụ |
| Cost / Data | JetBrains Mono | 500 | 0.875rem (14px) | Giá tiền VND, rating |

> Font Inter miễn phí trên Google Fonts, đọc tốt trên mọi kích thước, là lựa chọn hàng đầu cho UI hiện đại.

#### Spacing & Border Radius

```
Spacing scale (Tailwind default):
  4px (p-1) → 8px (p-2) → 12px (p-3) → 16px (p-4) → 24px (p-6) → 32px (p-8)

Border radius:
  Card:          12px (rounded-xl)
  Timeline card: 16px (rounded-2xl)
  Button:        8px  (rounded-lg)
  Input field:   8px  (rounded-lg)
  Tag/Chip:      20px (rounded-full)
  Avatar:        50%  (rounded-full)

Box shadow (card):
  Default:  0 1px 3px rgba(0,0,0,0.1)
  Hover:    0 4px 6px rgba(0,0,0,0.1)   + translateY(-2px)
  Active:   0 1px 2px rgba(0,0,0,0.1)
```

---

## 📐 10b. Thiết kế Giao diện & Wireframes v3 (Khớp 7 Yêu cầu Mới)

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

---

## ⚙️ 10c. Cài đặt Hệ thống & Tương tác UI v3

## 1. Loại bỏ Triệt để Persona UI
- Gỡ bỏ hoàn toàn component `PersonaPicker.jsx` và bảng chọn Avatar/Tone.
- Giao diện Settings chỉ tập trung vào:
  - **Tài khoản:** Đổi mật khẩu, liên kết Google Account, xóa tài khoản.
  - **Tích hợp:** Quản lý kết nối **Google Calendar** (trạng thái liên kết, hủy cấp quyền).
  - **Hồ sơ Du lịch (Travel Profile):** Xem những gì AI ghi nhớ về sở thích ẩm thực, quận quen thuộc, nhịp độ; nút bấm xóa trí nhớ hoặc tắt tính năng ghi nhớ.
  - **Giao diện:** Chế độ Sáng / Tối (Light / Dark mode).

## 2. Micro-interactions Mới
- **Nút [🌧️ Đổi điểm vì mưa]:** Hiệu ứng pulse màu xanh dương, khi bấm AI phản hồi với animation trượt mượt mà thay thế các thẻ ngoài trời.
- **Nút [📅 Đồng bộ Google Calendar]:** Hiệu ứng xoay tròn tải sự kiện và chuyển sang icon dấu tích xanh `✓ Đã đồng bộ vào Google Calendar`.
