> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# 📌 1. Tổng quan Dự án (Cập nhật v3 theo 7 Yêu cầu mới của Giảng viên)

- **Tên project**: Website AI Lên Lịch Trình Du Lịch TP.HCM (HCMC AI Travel Planner)
- **Loại hình**: Đồ án tốt nghiệp / Đồ án môn học, thuyết trình và bảo vệ demo bằng tiếng Anh hoặc tiếng Việt
- **Mô tả cốt lõi**: Ứng dụng web thông minh hỗ trợ lập kế hoạch du lịch tại TP. Hồ Chí Minh. Người dùng bắt buộc đăng nhập để hệ thống nhận diện danh tính và kế hoạch. Người dùng nhập thông tin qua bảng yêu cầu 8 tiêu chí chuyên sâu cho TP.HCM (số ngày, quận huyện, ngân sách, sở thích, số người, phương tiện, nhịp độ, ghi chú). AI vận hành theo luồng đàm thoại 4 bước (nhập form -> gợi ý định hướng -> người dùng duyệt/đồng ý -> sinh lịch trình chi tiết), kết hợp Google Places API (New) lấy dữ liệu địa điểm thật, bản đồ tương tác gửi kèm trong chat, kịch bản dự phòng khi trời mưa/kẹt xe, chấm điểm đánh giá lịch trình và tính năng đột phá **Đồng bộ tự động lên Google Calendar**.
- **Đối tượng người dùng**: Du khách trong và ngoài nước đến TP.HCM cần lịch trình tối ưu, tránh kẹt xe, tránh mưa ngập và muốn quản lý lịch trình chuyên nghiệp trên điện thoại.
- **Phạm vi địa lý**: Tập trung 100% vào TP. Hồ Chí Minh (các quận nội thành và khu vực phát triển: Q1, Q3, Q5, Q7, TP. Thủ Đức...).
- **Ngôn ngữ giao diện**: Tiếng Anh (hỗ trợ thuyết trình chuẩn quốc tế) và Tiếng Việt.

---

## 1.1. Sáu Nguyên tắc Sản phẩm Cốt lõi (Product Principles v3)

1. **Xác thực danh tính là nền tảng (Identity First):** Người dùng bắt buộc phải đăng nhập để sử dụng mọi tiện ích. Điều này giúp AI tích lũy lịch sử hội thoại, hiểu sâu sở thích và phục vụ cá nhân hóa chuẩn xác. Khách vãng lai chỉ xem Landing Page giới thiệu.
2. **Luồng đàm thoại 4 bước có kiểm soát:** Không vội vàng sinh lịch trình dài ngay khi vừa nhận form. AI đưa ra gợi ý định hướng cụ thể (Concept & Highlights) để người dùng duyệt trước, đảm bảo đúng ý muốn.
3. **Dữ liệu thực tế chống ảo giác (Grounding 100%):** Mọi địa điểm đều phải có thật qua Google Places API (New), có rating, giờ mở cửa và tọa độ định vị trên bản đồ.
4. **Luôn có phương án dự phòng (Contingency by Default):** Thiết kế riêng cho TP.HCM: sẵn sàng phương án đổi điểm trong nhà khi trời mưa, né cung đường kẹt xe giờ cao điểm, đổi địa điểm linh hoạt khi hết bàn.
5. **Tiện ích thực tế đến phút cuối (Google Calendar Integration):** Lịch trình không chỉ nằm trên web mà được đồng bộ vào Google Calendar của người dùng để nhắc nhở giờ giấc trên điện thoại.
6. **Tập trung vào tính chuyên nghiệp (No Persona Distraction):** Bỏ hoàn toàn phần chọn nhân vật/giọng điệu hoạt họa rườm rà. AI hoạt động như một Trợ lý Chuyên gia Du lịch Bản địa chuẩn mực.
