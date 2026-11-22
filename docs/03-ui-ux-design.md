# 🎨 03. Hệ Thống Thiết Kế Giao Diện & Trải Nghiệm (UI/UX Design System)


## Mục lục
- 1. Design System (Màu sắc, Typography, Component Tokens)
- 2. Wireframes & Bố cục màn hình
- 3. Cài đặt giao diện & Tương tác (Settings & Micro-interactions)

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
| AI Bubble | `#EEF2FF` (Indigo 50) | `#1E293B` (Slate 800) | Nền thẻ gợi ý AI |
| Text Primary | `#111827` (Gray 900) | `#F9FAFB` (Gray 50) | Tiêu đề, nội dung chính |
| Text Secondary | `#6B7280` (Gray 500) | `#9CA3AF` (Gray 400) | Mô tả phụ, timestamp |
| Border | `#E5E7EB` (Gray 200) | `#374151` (Gray 700) | Viền card, divider |
| Success | `#10B981` (Emerald 500) | `#34D399` (Emerald 400) | Under budget, thành công |
| Warning | `#F59E0B` (Amber 500) | `#FBBF24` (Amber 400) | Gần hết budget, cảnh báo |
| Error | `#EF4444` (Red 500) | `#F87171` (Red 400) | Lỗi, over budget |

> **Ý đồ thiết kế**: Blue (`#2563EB`) gợi sự tin tưởng + khám phá, Orange (`#F97316`) mang hơi ấm Việt Nam. Tổ hợp tương tự Airbnb (coral + neutral) nhưng chuyên nghiệp hơn cho AI tool. *(Hiện tại giao diện triển khai ở Light Mode; các token Dark Mode giữ làm tham chiếu thiết kế).*

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
| Heading H1 | Be Vietnam Pro (fallback Inter) | 800 (ExtraBold) / 700 | 2rem (32px) – 3.75rem | Tiêu đề trang (`font-display`) |
| Heading H2 | Be Vietnam Pro (fallback Inter) | 800 / 700 | 1.5rem (24px) – 2.25rem | Tiêu đề section |
| Heading H3 | Be Vietnam Pro (fallback Inter) | 700 / 600 | 1rem – 1.25rem (20px) | Tiêu đề card |
| Body | Be Vietnam Pro (fallback Inter) | 400 (Regular) | 1rem (16px) | Nội dung, `line-height: 1.6` |
| Timeline desc | Be Vietnam Pro (fallback Inter) | 400 | 0.875rem (14px) | Mô tả chi tiết địa điểm |
| Caption / Label | Be Vietnam Pro (fallback Inter) | 500–600 | 0.75rem (12px) | Timestamp, label phụ |
| Cost / Data | Be Vietnam Pro (fallback Inter) | 700–800 | 0.875rem (14px) | Giá tiền VND, rating, KPI số liệu |

> Font **Be Vietnam Pro** (tải từ Google Fonts trong `client/index.html` với các độ đậm 400–800, cấu hình làm font `sans` và `display` trong `client/tailwind.config.js`, fallback sang `Inter` và font hệ thống) được thiết kế tối ưu cho dấu tiếng Việt rõ nét ở mọi kích thước.

#### Spacing & Border Radius

```
Spacing scale (Tailwind default):
  4px (p-1) → 8px (p-2) → 12px (p-3) → 16px (p-4) → 24px (p-6) → 32px (p-8)

Border radius:
  Card:          12px (rounded-xl) – 24px (rounded-3xl)
  Timeline card: 16px (rounded-2xl)
  Button:        8px  (rounded-lg) – full pill (rounded-full)
  Input field:   8px  (rounded-lg) – 12px (rounded-xl)
  Tag/Chip:      20px (rounded-full)
  Avatar:        50%  (rounded-full)

Box shadow (card):
  Default:  0 1px 3px rgba(0,0,0,0.1)
  Hover:    0 4px 6px rgba(0,0,0,0.1)   + translateY(-2px)
  Active:   0 1px 2px rgba(0,0,0,0.1)
```

---

## 📐 10b. Thiết kế Giao diện & Wireframes

### Màn hình 1: Landing Page (Mở cho cả Khách vãng lai & Người dùng đã đăng nhập)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 📍 Sài Gòn Guide   [Cách hoạt động] [Tính năng] [Lên lịch]             │
│                    [Đăng nhập] [VI/EN] [Chuyến đi của tôi] [Lên lịch →]│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ✈️ LÊN LỊCH TRÌNH DU LỊCH TP. HỒ CHÍ MINH   ┌──────────────────────┐ │
│   Khám phá Sài Gòn đúng gu, rõ ngân sách      │ 🗓️ Lịch trình mẫu    │ │
│   [ 👉 Tạo lịch trình ngay (#plan) ]          │ • 09:00 Di tích Q3   │ │
│   [ Xem cách hoạt động ]                      │ • 11:30 Ẩm thực Q1   │ │
│   327 địa điểm · Theo dõi ngân sách · 2 chiều │ • 14:30 Cà phê Q1    │ │
│                                               └──────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  ✨ Cách hoạt động (3 bước) · Tính năng nổi bật · Chuyến đi gợi ý mẫu  │
├────────────────────────────────────────────────────────────────────────┤
│  🧭 BẢNG THIẾT KẾ CHUYẾN ĐI (#plan — Khách thấy & tạo ngay, 🚧 #31)   │
│  [Form 8 tiêu chí TP.HCM đặt trực tiếp trên trang chủ]                 │
└────────────────────────────────────────────────────────────────────────┘
```

> **Chế độ Khách (🚧 Đang triển khai #31):** Khách vãng lai thấy trực tiếp form tạo lịch trình ngay tại `#plan` trên Landing Page và tạo chuyến đi bằng header `x-session-id` (hiện tại `POST /api/v1/trips/` ở backend vẫn yêu cầu đăng nhập JWT trong lúc #31 đang hoàn thiện). Khi mở màn hình chuyến đi ở chế độ khách, thanh `SaveTripPrompt` gợi ý đăng ký/đăng nhập để claim chuyến đi vào tài khoản.

### Màn hình 2: Bảng Nhập Yêu Cầu Đầy đủ 8 Tiêu chí (`TripForm.jsx` tại `#plan`)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 📍 Sài Gòn Guide          [VI/EN]  [Chuyến đi của tôi]  [👤 Tài khoản] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ┌─ BẢNG THIẾT KẾ CHUYẾN ĐI TP. HỒ CHÍ MINH ──────────────────────────┐ │
│ │ 1. Số ngày: [ 3 ngày  -/+ ]      2. Khu vực: [ Quận 1, TP.HCM    ▼]│ │
│ │ 3. Ngân sách: [ 3,000,000 VND ]  4. Nhóm đi: [ 💑 Cặp đôi        ▼]│ │
│ │ 5. Phương tiện: [ 🛵 Xe máy/Grab ▼] 6. Nhịp độ: [ ⚖️ Cân bằng    ▼]│ │
│ │ 7. Sở thích: [🍜 Ẩm thực ✓] [☕ Cà phê ✓] [🏛️ Di tích] [🛍️ Mua sắm]│ │
│ │ 8. Ghi chú: [❄️ Ưu tiên máy lạnh ✓] [🥗 Ăn chay] [🌶️ Không cay]    │ │
│ │                                                                    │ │
│ │                  [ 🚀 TẠO LỊCH TRÌNH NGAY ]                         │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Màn hình 3: Bước 2 & 3 - AI Gợi Ý Định Hướng & Người Dùng Duyệt (🚧 Đang triển khai #25)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🤖 Sài Gòn Guide AI: Gợi ý định hướng chuyến đi của bạn (🚧 #25)       │
│                                                                        │
│ "Dựa trên yêu cầu của bạn, tôi đề xuất concept du lịch 2 ngày như sau: │
│  • Ngày 1: Quận 1 Di sản & Cà phê cổ kính (Dinh Độc Lập, Bảo tàng,...) │
│  • Ngày 2: Quận 3 Ẩm thực ngõ hẻm & Phố ốc đêm Tân Định               │
│ Bạn có đồng ý với định hướng này để tôi tạo lịch trình chi tiết không?"│
│                                                                        │
│ [ ✅ Đồng ý & Tạo lịch trình chi tiết ]    [ ✍️ Yêu cầu điều chỉnh lại ]│
└────────────────────────────────────────────────────────────────────────┘
```

> **Trạng thái (🚧 Đang triển khai #25):** Backend đã có endpoint `POST /api/v1/ai/concept` và `POST /api/v1/ai/generate` (dùng Gemini `GEMINI_MODEL`, mặc định `gemini-3.5-flash`), nhưng `TripForm.jsx` hiện chưa nối vào luồng duyệt Concept và gọi AI thật.

### Màn hình 4: Dashboard 4 Chế Độ Trải Nghiệm (2 Khung hình Song song)
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🧭 Sài Gòn Guide — TP. Hồ Chí Minh   [🌧️ Trời mưa] [⚠️ Giờ cao điểm]  │
│ [Khám phá Sài Gòn 3 ngày]  ·  3 ngày  ·  5.000.000 đ                   │
├────────────────────────────────────────────────────────────────────────┤
│ 🔵 1. Lịch trình Timeline  🟢 2. Đi thực tế  🟠 3. Chi tiêu  🟣 4. Tổng kết │
├───────────────────────────────────┬────────────────────────────────────┤
│ 🗺️ KHUNG 1: BẢN ĐỒ TƯƠNG TÁC       │ 📋 KHUNG 2: LỊCH TRÌNH 3 TẦNG     │
│ ┌─ Leaflet (OSM France) ────────┐ │                                    │
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
```

> *(Ghi chú trạng thái các nút tiện ích trên Dashboard: `[🌧️ Trời mưa]` và `[⚠️ Giờ cao điểm]` hiện chạy logic cục bộ ở frontend, backend đang triển khai ở **🚧 #8/#18**; `[📅 Đồng bộ Cal]` đang triển khai ở **🚧 #18**).*

---

## ⚙️ 10c. Cài đặt Hệ thống & Tương tác UI

### 1. Trang Cài đặt hiện có (`client/src/pages/SettingsPage.jsx`)
- **Khi chưa đăng nhập:** Hiển thị thẻ `SignInCard` mời đăng nhập hoặc tạo tài khoản để quản lý cài đặt.
- **Khi đã đăng nhập**, `SettingsPage.jsx` hiển thị 5 khối giao diện:
  1. **Thông tin Tài khoản (Account):** Avatar chữ cái đầu, tên hiển thị (`display_name` hoặc `username`), email (nếu có) và phương thức đăng nhập.
  2. **Tùy chọn hiển thị cục bộ (đang chờ dọn dẹp):** Dự án đã bỏ hoàn toàn Persona (`PersonaPicker.jsx` không tồn tại) và không có API settings ở backend; trong `SettingsPage.jsx` hiện vẫn còn form chọn `tone` và `ai_interaction` lưu trên state cục bộ phía client và cần dọn bỏ ở vòng cleanup tiếp theo.
  3. **Quyền riêng tư (Privacy):** Thẻ thông tin giải thích cách lưu trữ dữ liệu tài khoản.
  4. **Đổi mật khẩu (Change Password):** Form nhập mật khẩu hiện tại, mật khẩu mới (tối thiểu 8 ký tự) và xác nhận mật khẩu mới (hiển thị với tài khoản mật khẩu). *Lưu ý:* Backend chưa có endpoint đổi mật khẩu (client hiện gọi hàm giả lập cục bộ).
  5. **Xóa tài khoản (Danger Zone):** Yêu cầu nhập chính xác chuỗi `DELETE` và xác thực lại bằng mật khẩu để gọi `DELETE /api/v1/auth/me` (nhánh xác thực lại qua `GoogleSignInButton` hiện chưa có ở backend).
- **Tích hợp Google Calendar (🚧 Đang triển khai #18):** Chưa xuất hiện trong `SettingsPage.jsx`, sẽ bổ sung khi hoàn thiện module calendar ở PR #18.

### 2. Micro-interactions chính
- **Bản đồ ↔ Timeline:** Click vào thẻ lịch trình thì bản đồ Leaflet pan/zoom tới marker tương ứng và ngược lại; khi check-in, marker chuyển thành dấu tích xanh `✓` và nút đổi điểm bị khóa.
- **Nút `[🌧️ Trời mưa]` / `[⚠️ Giờ cao điểm]` (🚧 Đang triển khai #8/#18):** Hiện toast thông báo và cập nhật lại danh sách chặng (phần gọi API backend đang hoàn thiện ở PR #18).
- **Nút `[📅 Đồng bộ Google Calendar / Xuất .ICS]` (🚧 Đang triển khai #18):** Hiệu ứng tải và xác nhận trạng thái sau khi xuất/đồng bộ lịch.
