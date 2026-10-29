> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# 🎤 13. Kịch bản Thuyết trình Demo 5 Phút & Bộ Câu hỏi Phản biện (v3)

## 13.1. Kịch bản Thuyết trình Trọng tâm (Demo Script)

- **Phút 0:00 - 0:45 (Vấn đề & Bắt buộc Đăng nhập):**
  *"Kính thưa Thầy Cô và Hội đồng, du lịch TP.HCM với mạng lưới giao thông phức tạp và thời tiết mưa nắng thất thường là thách thức lớn cho du khách. Dự án HCMC AI Travel Planner bắt buộc người dùng đăng nhập ngay từ đầu để AI nhận diện sâu sắc sở thích cá nhân, theo dõi lịch sử và xây dựng hồ sơ du lịch dài hạn."*
- **Phút 0:45 - 2:00 (Form 8 Tiêu chí & Luồng 4 Bước):**
  *"Sau khi đăng nhập, nếu là người dùng cũ, hệ thống chào mừng trở lại và tự động điền sẵn sở thích từ chuyến trước. Bảng yêu cầu thu thập sâu 8 tiêu chí: số ngày, các quận cụ thể ở TP.HCM, ngân sách, số người, phương tiện di chuyển, nhịp độ và ghi chú. Khi gửi form, thay vì sinh lịch trình ngay, AI đưa ra gợi ý định hướng cụ thể (Concept & Highlights) để người dùng xác nhận, đúng chuẩn tương tác đàm thoại 4 bước."*
- **Phút 2:00 - 3:15 (Lịch trình, Bản đồ tương tác & Đổi địa điểm):**
  *"Khi người dùng đồng ý, AI kết hợp Google Places và thuật toán Haversine sinh lịch trình chi tiết. Đặc biệt, bản đồ số được nhúng trực tiếp vào khung chat kèm mini map card. Khi người dùng bấm [Đổi địa điểm này], AI đưa ra 2-3 lựa chọn thay thế tương đương cùng khu vực để chọn nhanh."*
- **Phút 3:15 - 4:15 (Dự phòng Thời tiết & Đột phá Google Calendar):**
  *"Nếu bất chợt trời đổ mưa to ngập đường, người dùng chỉ cần bấm nút [Trời mưa], AI tự động hoán đổi toàn bộ điểm tham quan ngoài trời sang các bảo tàng, quán cà phê trong nhà có mái che cùng quận. Sau khi ưng ý, tính năng đột phá nhất là [Đồng bộ Google Calendar]: chỉ một cú click, toàn bộ lịch trình xuất hiện trên Google Calendar với đầy đủ giờ giấc, địa điểm và nhắc nhở trên điện thoại."*
- **Phút 4:15 - 5:00 (Đánh giá AI & Kết luận):**
  *"Cuối cùng, người dùng có thể yêu cầu AI chấm điểm chuyên gia cho chuyến đi và xuất link chia sẻ cho bạn bè. Dự án đã bỏ hoàn toàn các yếu tố nhân vật rườm rà để tập trung vào hiệu năng thực tế. Em xin cảm ơn Thầy Cô."*

## 13.2. Bộ Câu hỏi Giảng viên có thể hỏi & Trả lời

**Q1: Tại sao dự án chuyển sang bắt buộc đăng nhập thay vì cho khách dùng thử?**
> *Trả lời: Dạ thưa Thầy Cô, du lịch là một trải nghiệm có tính gắn kết và liên tục. Việc bắt buộc đăng nhập giúp AI nhận diện người dùng ngay lập tức, truy xuất được dữ liệu các chuyến đi cũ để tự động điền form cho khách quen, bảo vệ quota API cá nhân và cho phép lưu trữ hồ sơ lịch trình an toàn, đồng thời mở đường cho việc cấp quyền đồng bộ Google Calendar.*

**Q2: Làm thế nào để đồng bộ lịch trình lên Google Calendar mà không bị lỗi trùng lặp?**
> *Trả lời: Dạ, hệ thống sử dụng Google Calendar API với OAuth 2.0. Khi đồng bộ, Backend tạo một Lịch mới mang tên chuyến đi hoặc lưu trữ mã `google_event_id` cho từng chặng vào CSDL. Nếu người dùng chỉnh sửa lịch trình và đồng bộ lại, hệ thống sẽ thực hiện cập nhật (PATCH/UPDATE) các sự kiện tương ứng thay vì tạo mới, tránh trùng lặp lịch.*

**Q3: Kịch bản dự phòng khi trời mưa xử lý như thế nào trong code?**
> *Trả lời: Dạ, trong CSDL và Google Places API, các địa điểm đều có gắn tag phân loại (museum, indoor_cafe, shopping_mall vs park, walking_street). Khi bấm nút Trời mưa, AI được chỉ thị lọc bỏ các chặng có thuộc tính 'outdoor', truy vấn các điểm thay thế có thuộc tính 'indoor' trong cùng một quận và cập nhật lại mảng `itinerary_items`.*
