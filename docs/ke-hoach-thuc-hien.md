# 🚀 KẾ HOẠCH THỰC HIỆN TOÀN DIỆN (THEO 7 YÊU CẦU MỚI)
## Kế hoạch phát triển & Bàn giao Đồ án

---

## 1. BẢNG DANH MỤC NHIỆM VỤ (WBS - WORK BREAKDOWN STRUCTURE)

| Mã | Nhóm công việc | Tên nhiệm vụ cụ thể | Ưu tiên | Độ khó (1-5) | Tiêu chí hoàn thành (Definition of Done) |
|:---:|---|---|:---:|:---:|---|
| **AUTH-01** | Xác thực | Chuyển đổi toàn bộ route sang bắt buộc JWT Auth | **P0 (Must)** | 2 | Khách không thể gọi API tạo chuyến hoặc chat. Mọi request cần Bearer token. |
| **AUTH-02** | Xác thực | Dựng Landing Page giới thiệu riêng cho Khách | **P0 (Must)** | 2 | Khách vào web thấy trang giới thiệu đẹp mắt kèm CTA đăng nhập rõ ràng. |
| **FORM-01** | Bảng yêu cầu | Mở rộng CSDL & Form nhập đủ 8 tiêu chí TP.HCM | **P0 (Must)** | 3 | Form nhận đủ: số ngày, quận TP.HCM, ngân sách, sở thích, số người, phương tiện, nhịp độ, ghi chú. |
| **AI-01** | AI Core | Xây dựng luồng tương tác 4 bước (Gợi ý -> Đồng ý -> Chi tiết) | **P0 (Must)** | 4 | AI sinh gợi ý tóm tắt trước, đợi user bấm đồng ý mới gọi tool sinh lịch trình chi tiết. |
| **AI-02** | AI Core | Tính năng đổi địa điểm (Swap Place) với 2-3 lựa chọn | **P0 (Must)** | 3 | Bấm đổi điểm, AI trả về 2-3 quán thay thế cụ thể cùng loại; cập nhật lại timeline khi chọn. |
| **MAP-01** | Bản đồ | Tích hợp Google Maps Embed và Card bản đồ trong Chat | **P0 (Must)** | 3 | Bản đồ ghim đúng tọa độ, có mini map card hiển thị trực tiếp trong khung chat. |
| **MAP-02** | Bản đồ | Đồng bộ tương tác 2 chiều Thẻ Timeline <-> Pin Bản đồ | **P1 (Should)**| 2 | Click thẻ timeline bản đồ tự pan/zoom; click pin bản đồ timeline tự cuộn. |
| **CONT-01**| Dự phòng | Xây dựng kịch bản dự phòng khi trời mưa (Indoor fallback) | **P0 (Must)** | 3 | Nút 'Trời mưa', AI tự động hoán đổi điểm ngoài trời sang điểm trong nhà có mái che. |
| **CONT-02**| Dự phòng | Cảnh báo kẹt xe giờ cao điểm & địa điểm đóng cửa | **P1 (Should)**| 3 | AI phát hiện giờ cao điểm (17h-19h) ưu tiên gom điểm gần nhau, tránh nút giao kẹt xe. |
| **PORT-01**| Lưu & Chia sẻ| Quản lý My Trips chuyên nghiệp trong tài khoản | **P0 (Must)** | 2 | Xem danh sách chuyến, đổi tên, xóa, nhân bản, ảnh bìa trực quan. |
| **PORT-02**| Lưu & Chia sẻ| Tạo link chia sẻ chỉ xem (/s/:token) và sao chép chuyến | **P0 (Must)** | 2 | Link chia sẻ bảo mật, ẩn thông tin nhạy cảm, người nhận có nút copy vào tài khoản. |
| **REV-01** | AI Đánh giá | Tính năng AI chấm điểm và đánh giá chuyên môn lịch trình | **P1 (Should)**| 3 | API `/api/trips/:id/review` trả về điểm số (thang 10), ưu điểm, cảnh báo, mẹo bản địa. |
| **CAL-01** | Google Calendar| Đăng ký Google Cloud OAuth Scope Calendar | **P0 (Must)** | 3 | Cấu hình Google Console cấp quyền tạo sự kiện lịch. |
| **CAL-02** | Google Calendar| Tích hợp Google Calendar API tạo sự kiện tự động | **P0 (Must)** | 4 | Bấm đồng bộ, toàn bộ các chặng xuất hiện trên Google Calendar có địa điểm và nhắc nhở. |
| **USER-01**| Người dùng cũ | Nhận diện người dùng cũ & Lời chào cá nhân hóa | **P0 (Must)** | 2 | Hiển thị lời chào thân thiện nhắc lại chuyến đi trước đó. |
| **USER-02**| Người dùng cũ | Tự động điền sẵn (Pre-filled) sở thích cũ vào form | **P0 (Must)** | 2 | Mở form thấy ngay các giá trị quận/phương tiện/nhịp độ quen thuộc đã chọn sẵn. |
| **CLEAN-01**| Dọn dẹp | XÓA BỎ HOÀN TOÀN tính năng chọn tính cách/giọng điệu AI | **P0 (Must)** | 2 | Gỡ bỏ personas.js, cột persona trong DB, UI chọn avatar/tone trong Settings. |
| **TEST-01**| Kiểm thử | Bộ test case kiểm tra 7 yêu cầu mới | **P0 (Must)** | 3 | Viết 15 test cases bao phủ auth, form 8 trường, Google Calendar, thời tiết. |
| **DEMO-01**| Bảo vệ | Soạn Slide thuyết trình & Video demo 3 phút chuẩn 7 yêu cầu | **P0 (Must)** | 2 | Slide tập trung vào điểm đột phá Google Calendar và AI dự phòng thời tiết. |

---

## 2. PHÂN KỲ PHÁT TRIỂN (4 TUẦN NƯỚC RÚT)
- **Tuần 1:** Triển khai AUTH-01, AUTH-02, CLEAN-01 (dọn bỏ persona), FORM-01 (8 trường TP.HCM).
- **Tuần 2:** Lõi AI-01 (luồng 4 bước), AI-02 (đổi địa điểm), MAP-01, MAP-02.
- **Tuần 3:** CAL-01, CAL-02 (Google Calendar), CONT-01, CONT-02 (dự phòng thời tiết/kẹt xe), REV-01 (đánh giá AI).
- **Tuần 4:** USER-01, USER-02 (người dùng cũ), hoàn thiện My Trips, kiểm thử TEST-01 và luyện tập demo DEMO-01.
