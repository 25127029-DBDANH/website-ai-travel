> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# 🎯 2. Phạm vi Tính năng (Scope v3 - Phân loại theo 7 Yêu cầu mới)

| Mức độ ưu tiên | Tính năng (Feature) | Mô tả chi tiết & Tiêu chí nghiệm thu |
|---|---|---|
| **P0 (Bắt buộc)** | **Xác thực & Bảo vệ tiện ích (Auth Gate)** | Bắt buộc đăng nhập để dùng tiện ích. Khách chỉ xem Landing Page giới thiệu. Hỗ trợ Username/Password và Google Sign-In. |
| **P0 (Bắt buộc)** | **Bảng nhập yêu cầu 8 tiêu chí TP.HCM** | Thu thập: Số ngày, Quận ở TP.HCM, Ngân sách, Sở thích, Số người, Phương tiện, Nhịp độ, Ghi chú đặc biệt. |
| **P0 (Bắt buộc)** | **Luồng AI 4 bước & Đổi địa điểm** | Form -> AI gợi ý cụ thể -> Người dùng đồng ý -> Sinh lịch trình chi tiết. Nút [Đổi địa điểm này] đưa ra 2-3 lựa chọn thay thế tương đương. |
| **P0 (Bắt buộc)** | **Bản đồ tương tác gửi kèm trong Chat** | Hiển thị Pins địa điểm trên Google Maps; gửi kèm mini Map Card trực tiếp trong khung chat; đồng bộ 2 chiều Card <-> Pin. |
| **P0 (Bắt buộc)** | **Phương án dự phòng trời mưa & sự cố** | Nút bấm nhanh [Trời mưa], AI tự động hoán đổi điểm ngoài trời sang điểm trong nhà cùng quận; cảnh báo kẹt xe giờ cao điểm (17h-19h). |
| **P0 (Bắt buộc)** | **Lưu & Chia sẻ lịch trình chuyên nghiệp** | Lưu trữ trong My Trips; tạo link chia sẻ chỉ xem (/s/:token) thu hồi được; người nhận có nút [Sao chép vào tài khoản]. |
| **P0 (Bắt buộc)** | **Đột phá: Đồng bộ Google Calendar** | Khi người dùng đồng ý, tự động tạo các sự kiện trên Google Calendar đúng khung giờ, địa điểm và gửi thông báo nhắc trước 30 phút. |
| **P0 (Bắt buộc)** | **Chào mừng người dùng cũ & Form điền sẵn** | Nhận diện người dùng cũ, chào mừng nồng nhiệt và tự động điền sẵn (pre-filled) các sở thích, quận quen thuộc từ chuyến trước. |
| **ĐÃ BỎ HOÀN TOÀN**| **Chọn tính cách / Giọng điệu AI (Persona)** | Bỏ toàn bộ tính năng chọn nhân vật (Anh Hai, Chị Ba, Bạn Tư...) và giọng điệu. AI giữ duy nhất vai trò Trợ lý Chuyên gia Du lịch TP.HCM. |
