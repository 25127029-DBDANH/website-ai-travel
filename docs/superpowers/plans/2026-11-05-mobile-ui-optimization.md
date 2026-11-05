# Kế Hoạch Tối Ưu Toàn Diện Giao Diện Mobile (All Pages Mobile UX Optimization)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tối ưu hóa trải nghiệm di động (Mobile Web) toàn diện cho tất cả các trang của Sài Gòn Guide (LandingPage, TripPage, MyTripsPage, SettingsPage, SiteHeader, Modals), giải quyết triệt để các vấn đề bẫy cuộn bản đồ, menu di động, bàn phím ảo, và chuyển đổi popup thành Bottom Sheet.

**Architecture:** Sử dụng Tailwind CSS mobile-first breakpoint (`sm:`, `lg:`), CSS Touch-action (`pointer: coarse`, `overscroll-behavior`), React state cho Mobile Drawer/Bottom Sheet, và tùy biến Leaflet Map interaction settings cho màn hình cảm ứng.

**Tech Stack:** React 18, Tailwind CSS, Lucide React, Framer Motion, Leaflet.

**Spec:** Đồ án Sài Gòn Guide - Thiết kế chuẩn di động theo `DESIGN.md` và `HUONG_DAN_SU_DUNG_TOOLS.md`.

## Global Constraints
- Bảo toàn toàn bộ chức năng hiện có trên Desktop (`lg:` breakpoint >= 1024px).
- Giữ nguyên dữ liệu local mock trong `src/lib/api.js`.
- Không bổ sung thêm thư viện nặng bên ngoài; tận dụng `motion/react`, `lucide-react`, và Tailwind CSS có sẵn.
- Tuân thủ token màu và typography trong `DESIGN.md`.

## Review Focus
- Bẫy cuộn ngón tay trên bản đồ di động (`TripMap`): Người dùng lướt ngón tay qua bản đồ phải cuộn được trang mà không bị kẹt drag bản đồ.
- Mobile Header Drawer: Bấm hamburger mở menu trượt mượt mà, bấm ra ngoài hoặc bấm link tự động đóng.
- Bottom Sheet cho Modal: Trên mobile, các hộp thoại trượt từ đáy màn hình lên, có nút đóng và thanh gạt trực quan.
- Bàn phím ảo trên Form: Nhập số ngày, ngân sách dùng `inputMode="numeric"`.
- Build sạch không có cảnh báo: `npm run build` thành công 100%.

---

### Task 1: Thiết kế Mobile Navigation Drawer trên Thanh Header (`SiteHeader.jsx`)

**Files:**
- Modify: `src/components/SiteHeader.jsx`

**Interfaces:**
- Consumes: `useI18n`, `useAuth`, `lucide-react` (`Menu`, `X`, `Briefcase`, `Settings`, `Home`, etc.)
- Produces: Giao diện Header có nút Hamburger trên mobile (< 1024px) mở Drawer trượt êm ái, đầy đủ các liên kết điều hướng.

- [x] **Step 1: Cập nhật state và nút Hamburger trong `SiteHeader.jsx`**
  - Thêm state `mobileMenuOpen` (boolean).
  - Thêm nút Toggle icon `Menu` / `X` chỉ hiển thị trên `< lg:hidden`.
- [x] **Step 2: Thêm lớp phủ và ngăn kéo trượt (Mobile Drawer) với hiệu ứng Motion**
  - Menu trượt xuống hoặc từ phải sang với nền `bg-white/95 backdrop-blur-2xl`.
  - Hiển thị danh sách liên kết: "Cách hoạt động", "Tính năng", "Lập kế hoạch", "Chuyến đi của tôi", "Cài đặt", nút đổi ngôn ngữ và thông tin đăng nhập/đăng xuất.
- [x] **Step 3: Đảm bảo tự động đóng menu khi chuyển trang hoặc nhấn vào liên kết**
  - Đóng khi click bất kỳ link nào hoặc click ra ngoài backdrop.
- [x] **Step 4: Kiểm tra build**
  - Chạy `npm run build` xác nhận không có lỗi cú pháp.

---

### Task 2: Chống "Bẫy Cuộn" Bản Đồ và Tối Ưu Trải Nghiệm Lịch Trình (`TripMap.jsx` & `ItineraryPanel.jsx`)

**Files:**
- Modify: `src/components/itinerary/TripMap.jsx`
- Modify: `src/components/itinerary/ItineraryPanel.jsx`

**Interfaces:**
- Consumes: Leaflet map instance, touch events
- Produces: Bản đồ trên mobile không chặn cuộn trang tự nhiên; bổ sung nút "Chạm để tương tác / Khóa bản đồ" hoặc hỗ trợ gesture 2 ngón tay.

- [x] **Step 1: Cấu hình `TripMap.jsx` vô hiệu hóa gesture 1 ngón tay gây kẹt cuộn trên màn hình cảm ứng**
  - Trên mobile, thiết lập Leaflet `dragging: false` hoặc cho phép bật tương tác khi người dùng bấm vào nút "Tương tác bản đồ / Mở rộng".
  - Thêm nút gạt "Mở khóa tương tác" trên góc bản đồ để người dùng chủ động zoom/pan khi cần.
- [x] **Step 2: Tối ưu thanh chọn ngày (`Day Tabs`) và Gallery ảnh trên `ItineraryPanel.jsx`**
  - Thêm lớp CSS `overflow-x-auto scrollbar-none snap-x` và padding phải `pr-4` để nút ngày cuối cùng không bị che khuất.
  - Tối ưu kích thước thẻ dừng chân timeline trên màn hình nhỏ.
- [x] **Step 3: Kiểm tra build**
  - Chạy `npm run build` xác nhận component compile sạch.

---

### Task 3: Tối Ưu Trang Chủ và Bàn Phím Ảo Form Lập Kế Hoạch (`LandingPage.jsx` & `TripForm.jsx`)

**Files:**
- Modify: `src/pages/LandingPage.jsx`
- Modify: `src/components/TripForm.jsx`

**Interfaces:**
- Consumes: Form inputs, Hero layout
- Produces: Giao diện form tạo chuyến tối ưu cho ngón tay và bàn phím ảo điện thoại.

- [x] **Step 1: Thêm thuộc tính `inputMode` và `enterKeyHint` cho các ô nhập trong `TripForm.jsx`**
  - Thêm `inputMode="numeric"` cho ngân sách, số ngày để mở bàn phím số trên iPhone/Android.
  - Đảm bảo các chip danh mục sở thích (`preferenceOptions`) có khoảng cách chạm tối thiểu `touch-target` và không bị vỡ hàng.
- [x] **Step 2: Tối ưu hoá nhịp bố cục trên `LandingPage.jsx`**
  - Điều chỉnh cỡ chữ Hero Title cho màn hình nhỏ (`text-3xl sm:text-5xl lg:text-6xl`).
  - Giảm bớt padding thừa trên mobile (`py-12 sm:py-20`), căn chỉnh thẻ thống kê `stats` 3 cột gọn đẹp.
- [x] **Step 3: Kiểm tra build**
  - Chạy `npm run build` xác nhận pass.

---

### Task 4: Chuyển Đổi Popup thành Bottom Sheet Trên Mobile (`Modal.jsx` & `ShareDialog.jsx`)

**Files:**
- Modify: `src/components/Modal.jsx`
- Modify: `src/components/ShareDialog.jsx`

**Interfaces:**
- Consumes: Props `open`, `onClose`, `title`, `children`
- Produces: Trên desktop hiển thị Modal căn giữa màn hình; trên mobile chuyển thành Bottom Sheet trượt từ đáy lên có tay nắm `pull-bar`.

- [x] **Step 1: Cập nhật `Modal.jsx` hỗ trợ kiểu dáng Bottom Sheet trên mobile**
  - Thay đổi container từ `items-center` thành `items-end sm:items-center`.
  - Lớp bo góc: `rounded-t-3xl sm:rounded-3xl`.
  - Thêm thanh kéo giả lập (drag handle indicator: thanh bo tròn nhỏ ở đỉnh sheet).
- [x] **Step 2: Đồng bộ kiểu dáng Bottom Sheet cho `ShareDialog.jsx`**
  - Đảm bảo các nút sao chép link, mã QR và nút chia sẻ vừa vặn ngón tay cái.
- [x] **Step 3: Kiểm tra build**
  - Chạy `npm run build` xác nhận pass.

---

### Task 5: Chụp Lại Bộ Ảnh Màn Hình Mobile và Nghiệm Thu (Verification)

**Files:**
- Modify: `/tmp/screenshot.mjs` (nếu cần cập nhật thêm góc chụp)
- Output: `screenshots/mobile_*.png`

- [x] **Step 1: Chạy build production kiểm tra bundle cuối cùng**
  - Lệnh: `npm run build`
- [x] **Step 2: Chụp lại ảnh màn hình Mobile của các trang**
  - Chụp lại `mobile_landing.png`, `mobile_trips.png`, `mobile_trip.png`, `mobile_settings.png` sau khi tối ưu.
- [x] **Step 3: Báo cáo kết quả chi tiết với liên kết file ảnh**
