# 📝 NHẬT KÝ THAY ĐỔI SO VỚI KẾ HOẠCH CŨ (CHANGELOG)
## Cập nhật theo 7 yêu cầu mới của Giảng viên hướng dẫn

---

## 1. BẢNG ĐỐI CHIẾU NỘI DUNG THAY ĐỔI

| Hạng mục | Kế hoạch cũ (plan02-full.md) | Kế hoạch MỚI (7 yêu cầu Giảng viên) | Lý do thay đổi |
|---|---|---|---|
| **1. Quyền truy cập của Khách** | Khách được dùng đầy đủ Chat AI và lập kế hoạch mà không cần tài khoản (`session_id`). Chỉ nhắc đăng ký sau khi có lịch trình. | **BẮT BUỘC ĐĂNG NHẬP** để dùng mọi tiện ích (Chat AI, form, lịch trình, bản đồ, calendar). Khách chỉ xem trang giới thiệu. | Giảng viên yêu cầu: AI cần nhận diện người dùng, sở thích và kế hoạch dựa trên lịch sử trò chuyện cũ ngay từ đầu. |
| **2. Bảng nhập yêu cầu (Form)** | Chỉ có 4 trường: Điểm xuất phát, ngân sách, số ngày, sở thích chung (tag chips). | **ĐẦY ĐỦ 8 TRƯỜNG TP.HCM:** Số ngày, Quận ở TP.HCM, Ngân sách, Sở thích, Số người, Phương tiện di chuyển, Nhịp độ (Pace), Ghi chú đặc biệt. | Thu thập thông tin sâu và chính xác hơn cho bối cảnh giao thông/địa lý TP.HCM. |
| **3. Luồng đàm thoại với AI** | Gửi form -> AI gọi tool sinh ngay lịch trình chi tiết (kèm hỏi phụ 1 câu nếu thiếu thông tin). | **LUỒNG 4 BƯỚC:** Nhập form -> AI đưa gợi ý cụ thể (định hướng) -> Người dùng duyệt/đồng ý -> AI sinh lịch trình chi tiết. | Giúp người dùng nắm bắt và thống nhất ý tưởng trước khi bung lịch trình dài, tránh lãng phí token. |
| **4. Cơ chế Đổi địa điểm** | Chat tự do: "Swap dinner on Day 1". | Bấm nút **[Đổi địa điểm này]**, AI đưa **2 - 3 lựa chọn thay thế cụ thể** cùng loại để người dùng chọn. | Thao tác một chạm trực quan, AI chủ động đưa lựa chọn thay thế thay vì bắt người dùng tự nghĩ. |
| **5. Bản đồ trong tương tác** | Bản đồ nằm cố định ở panel bên phải, tách rời khung chat. | Bản đồ số tương tác toàn diện, **gửi kèm thẻ bản đồ (Map Card) ngay trong cuộc trò chuyện**. | Trực quan hóa lộ trình ngay trong dòng chảy đối thoại. |
| **6. Phương án dự phòng (Contingency)** | Chỉ xử lý lỗi kỹ thuật API timeout, budget overflow. Chưa có kịch bản sự cố thực tế. | **TÍCH HỢP PHƯƠNG ÁN DỰ PHÒNG THỰC TẾ:** Trời mưa (Indoor fallback), kẹt xe giờ cao điểm, điểm đến đóng cửa, vượt ngân sách. | Đồ án có tính thực tế cao, giải quyết đúng đặc thù mưa nắng ngập nước và kẹt xe của TP.HCM. |
| **7. Đánh giá lịch trình từ AI** | Chỉ có người dùng đánh giá sao sau khi đi (P4 feedback). | **AI CHỦ ĐỘNG ĐÁNH GIÁ LỊCH TRÌNH:** Chấm điểm độ hợp lý, chỉ ra ưu điểm, cảnh báo kẹt xe/đông đúc và gợi ý mẹo bản địa. | Tăng tính chuyên gia và giá trị gia tăng của AI đối với kế hoạch du lịch. |
| **8. Tích hợp Google Calendar** | Chưa có trong kế hoạch cũ (chỉ có ý tưởng xuất PDF/ICS ở mục Roadmap). | **ĐỒNG BỘ GOOGLE CALENDAR (ĐIỂM ĐỘT PHÁ):** Đưa toàn bộ chặng đi lên Calendar, tự động gửi thông báo nhắc lịch trên điện thoại. | Tính năng đột phá, ứng dụng thực tế cao, tạo điểm nhấn kỹ thuật cho buổi bảo vệ đồ án. |
| **9. Tùy biến Persona / Giọng điệu AI** | Có 5 persona (Sài Gòn Guide, Anh Hai, Chị Ba, Bạn Tư, Rainbow Guide) và 3 giọng điệu. | **BỎ HOÀN TOÀN phần chọn tính cách/giọng điệu AI.** AI giữ duy nhất một phong cách: Trợ lý chuyên gia du lịch TP.HCM chuyên nghiệp, am hiểu bản địa. | Loại bỏ rườm rà không cần thiết theo chỉ đạo trực tiếp của Giảng viên. |
| **10. Người dùng cũ quay lại** | Tính tier 2 theo số chuyến hoàn tất, lời chào chung chung. | **CHÀO MỪNG TRỞ LẠI & ĐIỀN SẴN SỞ THÍCH CŨ VÀO FORM:** Tái sử dụng quận yêu thích, phương tiện, nhịp độ chuyến trước. | Tối ưu hóa onboarding cho khách quen, tiết kiệm thời gian nhập liệu. |

---

## 2. DANH SÁCH CÁC THÀNH PHẦN CŨ BỊ BÃI BỎ TRIỆT ĐỂ
1. Bãi bỏ file `server/src/personas.js` và toàn bộ định nghĩa persona/tone.
2. Bãi bỏ bảng chọn Avatar/Persona trong Settings UI (`PersonaPicker.jsx`).
3. Bãi bỏ chế độ khách dùng không đăng nhập (Guest Mode on Chat/Trips).
4. Bãi bỏ khái niệm `client_settings` gửi kèm persona từ client.
5. Bãi bỏ giao diện điền khuyết tự do dạng Mad-Libs cũ, chuyển thành Form 8 trường chuẩn mực.
