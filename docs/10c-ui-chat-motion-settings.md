> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# ⚙️ 10c. Cài đặt Hệ thống & Tương tác UI v3

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
