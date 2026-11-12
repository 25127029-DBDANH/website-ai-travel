> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# 🎯 2. Phạm vi Tính năng (Scope v3 - Phân loại theo 7 Yêu cầu mới)

| Mức độ ưu tiên | Tính năng (Feature) | Mô tả chi tiết & Tiêu chí nghiệm thu |
|---|---|---|
| **P0 (Bắt buộc)** | **Xác thực & Bảo vệ tiện ích (Auth Gate)** | Bắt buộc đăng nhập để dùng tiện ích. Khách chỉ xem Landing Page giới thiệu. Hỗ trợ Username/Password và Google Sign-In. |
| **P0 (Bắt buộc)** | **Bảng nhập yêu cầu 8 tiêu chí TP.HCM** | Thu thập: Số ngày, Quận ở TP.HCM, Ngân sách, Sở thích, Số người, Phương tiện, Nhịp độ, Ghi chú đặc biệt. |
| **P0 (Bắt buộc)** | **AI Engine & Đổi địa điểm thông minh** | Form 8 tiêu chí -> AI sinh lịch trình tối ưu. Nút [Đổi địa điểm] đưa ra 2-3 lựa chọn thay thế qua Modal trực quan; khóa nút khi đã check-in. |
| **P0 (Bắt buộc)** | **Bố cục 2 khung hình & Bản đồ tương tác** | Khung 1 Bản đồ Leaflet song song Khung 2 Timeline 3 tầng chống đè chữ; đổi pin thành dấu tích xanh `✓` khi đã check-in; đồng bộ 2 chiều. |
| **P0 (Bắt buộc)** | **Chế độ Đi thực tế & Gọi xe 3 hãng** | Tab 2 Live Companion: Thẻ Hero chỉ đường, tích hợp đặt xe 3 app (Grab, Xanh SM, Be) với cước ước tính, check-in chụp ảnh thực tế. |
| **P0 (Bắt buộc)** | **Sổ chi tiêu có cước xe & Tổng kết chuyến đi** | Tab 3 Sổ chi tiêu cho phép sửa tiền xe inline; Tab 4 Tổng kết 4 KPI, cơ cấu 3 nhóm tiền, album ảnh và xuất Thẻ ảnh kỷ niệm Story Card (9:16). |
| **P0 (Bắt buộc)** | **Phương án dự phòng trời mưa & sự cố** | Nút bấm nhanh [Trời mưa], AI tự động hoán đổi điểm ngoài trời sang điểm trong nhà cùng quận; cảnh báo kẹt xe giờ cao điểm (17h-19h). |
| **P0 (Bắt buộc)** | **Lưu & Chia sẻ lịch trình chuyên nghiệp** | Lưu trữ trong My Trips; tạo link chia sẻ chỉ xem (/s/:token) thu hồi được; người nhận có nút [Sao chép vào tài khoản]. |
| **P0 (Bắt buộc)** | **Đột phá: Đồng bộ Google Calendar** | Khi người dùng đồng ý, tự động tạo các sự kiện trên Google Calendar đúng khung giờ, địa điểm và gửi thông báo nhắc trước 30 phút. |
| **P0 (Bắt buộc)** | **Chào mừng người dùng cũ & Form điền sẵn** | Nhận diện người dùng cũ, chào mừng nồng nhiệt và tự động điền sẵn (pre-filled) các sở thích, quận quen thuộc từ chuyến trước. |
| **ĐÃ BỎ HOÀN TOÀN**| **Chọn tính cách / Giọng điệu AI (Persona)** | Bỏ toàn bộ tính năng chọn nhân vật (Anh Hai, Chị Ba, Bạn Tư...) và giọng điệu. AI giữ duy nhất vai trò Trợ lý Chuyên gia Du lịch TP.HCM. |
