# 📋 ĐẶC TẢ CHI TIẾT 7 YÊU CẦU MỚI (GIẢNG VIÊN HƯỚNG DẪN)
## Dự án: Website AI Lên Lịch Trình Du Lịch TP.HCM (HCMC AI Travel Planner)

---

## 1. YÊU CẦU 1: BẮT BUỘC ĐĂNG NHẬP ĐỂ SỬ DỤNG TIỆN ÍCH
### 1.1. Mục tiêu
Đảm bảo mọi tiện ích thông minh (Chat AI, lập kế hoạch, tương tác bản đồ, xem timeline chi tiết, chia sẻ lịch trình, đồng bộ Google Calendar) đều gắn liền với danh tính người dùng cụ thể. Khách vãng lai (Guest) chỉ xem trang giới thiệu (Landing/Hero Page) và phải đăng nhập/đăng ký để bắt đầu trải nghiệm. Mục đích cốt lõi: AI nhận diện người dùng, ghi nhớ sở thích, tích lũy lịch sử trò chuyện và các chuyến đi cũ để cá nhân hóa chuẩn xác.

### 1.2. Người dùng & Luồng thao tác
- **Khách (Guest):** Mở website chỉ thấy Landing Page giới thiệu tính năng, review mẫu và nút bấm kêu gọi hành động (CTA) **[Đăng nhập / Đăng ký]**. Không có ô nhập chat hay form tạo lịch trình ở chế độ khách.
- **Phương thức xác thực:**
  - Đăng nhập bằng tài khoản nội bộ: Username / Password.
  - Đăng nhập một chạm: Google Sign-In (OAuth 2.0).
  - Có tính năng Quên mật khẩu / Đặt lại mật khẩu qua email xác nhận.
- **Hệ thống xử lý:**
  - Mọi API nghiệp vụ (`/api/trips/*`, `/api/chat/*`, `/api/places/*`, `/api/calendar/*`) yêu cầu header `Authorization: Bearer <JWT>`. Nếu thiếu hoặc token không hợp lệ, trả về mã lỗi `401 Unauthorized`.
  - Không còn sử dụng cơ chế định danh ẩn danh khách qua `x-session-id` cho các tiện ích lập lịch trình.

### 1.3. Đầu vào & Đầu ra
- **Đầu vào:** Thông tin đăng nhập (`username`, `password`) hoặc `google_id_token`.
- **Đầu ra:** `token` (JWT), `user` profile (ID, tên hiển thị, email), điều hướng thẳng tới màn hình chào đón và bảng nhập yêu cầu.

### 1.4. Trường hợp lỗi
- Nhập sai mật khẩu: Báo lỗi chung *"Tên đăng nhập hoặc mật khẩu không chính xác"* (tránh lộ thông tin tài khoản).
- Token hết hạn: Tự động đăng xuất, hiển thị modal thông báo phiên đăng nhập hết hạn và yêu cầu đăng nhập lại.

### 1.5. Tiêu chí hoàn thành (DoD)
- Khách không thể truy cập bất kỳ route hoặc API tạo lịch trình nào.
- 100% chuyến đi và lịch sử chat gắn chặt với `user_id` trong database.

---

## 2. YÊU CẦU 2: LỜI CHÀO + BẢNG NHẬP YÊU CẦU ĐẦY ĐỦ & LUỒNG 4 BƯỚC
### 2.1. Mục tiêu
Thiết lập quy trình thu thập thông tin du lịch toàn diện tại TP.HCM và vận hành luồng đàm thoại có cấu trúc chặt chẽ: Form -> AI gợi ý cụ thể -> Người dùng đồng ý -> AI sinh lịch trình chi tiết. Cung cấp cơ chế đổi địa điểm linh hoạt khi người dùng muốn thay đổi.

### 2.2. Bảng nhập yêu cầu (8 trường thông tin bắt buộc tại TP.HCM)
1. **Số ngày:** 1 đến 14 ngày.
2. **Khu vực / Quận ở TP.HCM:** Chọn các quận cụ thể (Quận 1, Quận 3, Quận 5 - Chợ Lớn, Quận 7, TP. Thủ Đức - Thảo Điền, Bình Thạnh...).
3. **Ngân sách:** Tổng ngân sách dự kiến (VND) hoặc mức chi tiêu/ngày.
4. **Sở thích du lịch:** Ẩm thực đường phố, cà phê specialty, bảo tàng lịch sử, di tích văn hóa, mua sắm, giải trí về đêm (nightlife), check-in chụp ảnh, thiên nhiên/công viên.
5. **Số lượng người:** Đi một mình (Solo), Cặp đôi (Couple), Nhóm bạn (Friends), Gia đình có trẻ nhỏ/người lớn tuổi (Family).
6. **Phương tiện di chuyển:** Đi bộ, Xe máy (GrabBike/thuê xe), Ô tô/Taxi (GrabCar), Xe buýt/Metro.
7. **Nhịp độ chuyến đi (Pace):** Thư thả (Relaxed - ít điểm, nghỉ ngơi nhiều), Cân bằng (Moderate), Dày đặc (Packed/Fast-paced - khám phá tối đa).
8. **Ghi chú đặc biệt (Special notes):** Ăn chay, kiêng cay, không đi bộ xa, tránh nơi đông người, có trẻ em...

### 2.3. Luồng đàm thoại 4 bước (Interactive Planning Flow)
1. **Bước 1 (Submit Form):** Người dùng nhập form 8 tiêu chí và gửi.
2. **Bước 2 (AI Suggestion):** AI phân tích và đưa ra **gợi ý định hướng cụ thể** (Concept & Highlights), ví dụ:
   - *"Với 2 ngày tại Quận 1 và Quận 3 cho nhóm bạn thích ẩm thực, tôi đề xuất: Ngày 1 tập trung văn hóa và ẩm thực di sản (Bảo tàng Chứng tích Chiến tranh, Phở Pasteur, Cà phê chung cư Nguyễn Huệ); Ngày 2 trải nghiệm Chợ Bến Thành và phố ẩm thực đêm Tân Định. Bạn có đồng ý với định hướng này không?"*
   - Kèm 2 nút bấm: `[Đồng ý & Tạo lịch trình chi tiết]` và `[Cần chỉnh sửa lại]`.
3. **Bước 3 (User Confirmation):** Người dùng bấm **"Đồng ý"** (hoặc gửi phản hồi tinh chỉnh).
4. **Bước 4 (Detailed Itinerary Generation):** AI kích hoạt tạo lịch trình chi tiết theo từng khung giờ (08:30 - 11:30, 12:00 - 13:30...), kết hợp dữ liệu Google Places, bản đồ và tính toán cước di chuyển.

### 2.4. Xử lý Đổi địa điểm (Swap Place)
- Trên mỗi thẻ địa điểm trong lịch trình có nút **[🔄 Đổi địa điểm này]**.
- Khi bấm nút:
  - Hệ thống gửi yêu cầu đổi địa điểm tới AI.
  - AI tìm kiếm trong cùng khu vực/quận và đưa ra **2 - 3 lựa chọn thay thế tương đương** cùng loại hình và ngân sách (kèm ảnh, rating, lý do thay thế).
  - Người dùng bấm chọn 1 phương án -> AI tự động cập nhật lại lịch trình, tính lại lộ trình di chuyển và ngân sách tổng thể.

### 2.5. Tiêu chí hoàn thành (DoD)
- Form nhập đầy đủ 8 trường thông tin đặc thù TP.HCM.
- AI tuân thủ luồng gợi ý định hướng trước khi bung lịch trình chi tiết.
- Đổi địa điểm thành công với 2-3 gợi ý cụ thể, không làm gãy cấu trúc lịch trình.

---

## 3. YÊU CẦU 3: BẢN ĐỒ TƯƠNG TÁC GỬI KÈM TRONG CUỘC TRÒ CHUYỆN / LỊCH TRÌNH
### 3.1. Mục tiêu
Trực quan hóa không gian địa lý, hiển thị chính xác vị trí các điểm đến tại TP.HCM trên bản đồ số, nhúng bản đồ trực tiếp vào khung chat và màn hình lịch trình.

### 3.2. Chức năng cụ thể
- **Khám phá trên bản đồ:** Người dùng có thể click vào từng điểm trên bản đồ để xem Pop-up thông tin: Tên quán/địa danh, địa chỉ thật, đánh giá sao, hình ảnh và khung giờ mở cửa.
- **Bản đồ gửi kèm trong cuộc trò chuyện (In-chat Map Card):** Khi AI phản hồi gợi ý hoặc cập nhật lịch trình, AI gửi kèm một khối bản đồ thu nhỏ (Mini Map Card) hiển thị các Marker được đánh số thứ tự (1, 2, 3...) kết nối bằng đường nối lộ trình di chuyển.
- **Đồng bộ hai chiều (Bi-directional Sync):** Click vào thẻ địa điểm trên Timeline thì bản đồ tự động Pan/Zoom tới Marker tương ứng; ngược lại, click vào Marker trên bản đồ thì Timeline tự cuộn đến đúng thẻ.

### 3.3. Tiêu chí hoàn thành (DoD)
- 100% địa điểm trong lịch trình có tọa độ (lat, lng) hiển thị chính xác trên Google Maps.
- Khung chat hiển thị được bản đồ lộ trình trực quan.

---

## 4. YÊU CẦU 4: PHƯƠNG ÁN DỰ PHÒNG THÔNG MINH (CONTINGENCY PLANNING)
### 4.1. Mục tiêu
Giúp người dùng không bị động trước các sự cố thực tế thường gặp khi du lịch tại TP.HCM: trời mưa lớn ngập đường, kẹt xe giờ cao điểm, địa điểm bất ngờ đóng cửa, hoặc chi tiêu vượt ngân sách.

### 4.2. Các kịch bản dự phòng tích hợp
1. **Trời mưa / Thời tiết xấu:**
   - Kích hoạt: Người dùng bấm nút nhanh `[🌧️ Trời đang mưa, đổi chỗ khác]` hoặc AI phát hiện cảnh báo thời tiết.
   - Xử lý: AI tự động thay thế các điểm tham quan ngoài trời (Phố đi bộ Nguyễn Huệ, Công viên Tao Đàn, Thảo Cầm Viên) bằng các địa điểm trong nhà có mái che cùng quận (Bảo tàng Mỹ thuật, Dinh Độc Lập, Trung tâm thương mại Takashimaya, quán cà phê trong nhà).
2. **Kẹt xe giờ cao điểm (17:00 - 19:00):**
   - AI cảnh báo và tối ưu hóa lộ trình gom cụm trong cùng 1 quận, hạn chế di chuyển qua các nút giao thông điểm nóng (cầu Kênh Tẻ, ngã tư Hàng Xanh, vòng xoay Phù Đổng).
3. **Địa điểm đóng cửa / Hết bàn:**
   - Đưa ra ngay phương án thế chỗ (Fallback Spot) cách dưới 1 km đã được kiểm tra còn mở cửa.
4. **Hết / Vượt ngân sách (Over Budget):**
   - AI phát hiện tổng chi phí vượt ngân sách -> Đề xuất giảm tải các bữa ăn sang các quán ăn đặc sản bình dân chất lượng cao (rating >= 4.3).

### 4.3. Tiêu chí hoàn thành (DoD)
- Có nút kích hoạt kịch bản thời tiết/sự cố ngay trên giao diện.
- AI sinh phương án thay thế hợp lý trong vòng dưới 5 giây.

---

## 5. YÊU CẦU 5: LƯU & CHIA SẺ CHUYÊN NGHIỆP + ĐÁNH GIÁ LỊCH TRÌNH TỪ AI
### 5.1. Mục tiêu
Nâng tầm trải nghiệm lưu trữ chuyến đi thành một hồ sơ du lịch hoàn chỉnh trong tài khoản; hỗ trợ chia sẻ thuận tiện cho bạn bè và cung cấp tính năng độc đáo: **AI chấm điểm & đánh giá chuyên môn cho lịch trình**.

### 5.2. Chức năng cụ thể
1. **Lưu chuyến đi dạng chuyên nghiệp (Professional Trip Portfolio):**
   - Chuyến đi lưu trong mục **My Trips** với đầy đủ siêu dữ liệu: Bìa ảnh đại diện, tổng ngân sách, chi phí thực tế, danh sách địa điểm theo ngày, thời gian di chuyển dự kiến.
2. **Chia sẻ lịch trình dễ dàng:**
   - Tạo link chia sẻ công khai chỉ xem (`/s/:token`) có thể thu hồi bất cứ lúc nào.
   - Người nhận có nút `[Sao chép vào tài khoản của tôi]` để tự do tùy biến.
3. **Đánh giá lịch trình từ AI (AI Itinerary Review & Score):**
   - Người dùng bấm nút **[⭐ Yêu cầu AI đánh giá lịch trình]**.
   - AI đóng vai trò Chuyên gia Du lịch Bản địa TP.HCM, phân tích và xuất báo cáo đánh giá:
     - **Điểm số tổng quan (Thang điểm 10 hoặc 100):** Dựa trên tính khả thi, độ hợp lý về địa lý, độ đa dạng trải nghiệm.
     - **Ưu điểm nổi bật:** Các điểm đến xuất sắc, khung giờ hợp lý.
     - **Cảnh báo & Rủi ro:** Điểm nào có thể đông đúc, khoảng cách nào có nguy cơ kẹt xe.
     - **Lời khuyên địa phương (Insider Tips):** Món nên thử tại từng quán, trang phục phù hợp khi vào di tích.

### 5.3. Tiêu chí hoàn thành (DoD)
- Endpoint `POST /api/trips/:id/review` trả về cấu trúc đánh giá JSON chuẩn mực.
- Giao diện hiển thị bảng điểm đánh giá trực quan (Score badge, tips card).

---

## 6. YÊU CẦU 6: TÍCH HỢP GOOGLE CALENDAR (TÍNH NĂNG ĐỘT PHÁ)
### 6.1. Mục tiêu
Tự động đồng bộ toàn bộ lịch trình chi tiết lên ứng dụng **Google Calendar** của người dùng khi được sự đồng ý, giúp gửi thông báo nhắc lịch theo từng khung giờ thực tế trên điện thoại, đảm bảo không bỏ lỡ chuyến đi.

### 6.2. Luồng thao tác
1. Sau khi lịch trình hoàn thiện, người dùng bấm nút **[📅 Đồng bộ lên Google Calendar]**.
2. Hệ thống kiểm tra quyền:
   - Nếu đã liên kết Google: Hiển thị hộp thoại xác nhận ngày bắt đầu chuyến đi.
   - Nếu chưa liên kết Google: Mở cửa sổ OAuth xin cấp quyền `https://www.googleapis.com/auth/calendar.events`.
3. Người dùng chọn ngày bắt đầu (ví dụ: ngày 15/11/2026) và bấm **[Xác nhận đồng bộ]**.
4. Backend gọi Google Calendar API tạo một Lịch mới hoặc các Sự kiện (Events) tương ứng với từng chặng trong lịch trình:
   - Tên sự kiện: `[Du lịch TP.HCM] Tham quan Bảo tàng Chứng tích Chiến tranh`
   - Thời gian: `08:30 - 11:00`, ngày tương ứng.
   - Địa điểm: Địa chỉ thực tế từ Google Places.
   - Mô tả: Ghi chú của AI, chi phí ước tính, số điện thoại quán.
   - Nhắc nhở (Notification): Báo trước 30 phút qua Google Calendar app.
5. Hệ thống trả về link mở lịch trên Google Calendar và hiển thị trạng thái đã đồng bộ thành công.

### 6.3. Tiêu chí hoàn thành (DoD)
- Kết nối thành công Google Calendar API thông qua OAuth 2.0.
- Sự kiện xuất hiện đầy đủ trên Google Calendar đúng khung giờ và địa điểm.

---

## 7. YÊU CẦU 7: TRẢI NGHIỆM NGƯỜI DÙNG CŨ & BỎ HOÀN TOÀN CHỌN TÍNH CÁCH AI
### 7.1. Chào mừng người dùng cũ & Tái sử dụng sở thích
- Khi người dùng đã có lịch sử chuyến đi đăng nhập lại:
  - Hệ thống hiển thị lời chào cá nhân hóa: *"Chào mừng bạn quay lại, [Tên Người Dùng]! Lần trước bạn đã khám phá ẩm thực Quận 1 rất tuyệt vời."*
  - Form nhập thông tin được **tự động điền sẵn (Pre-filled)** các sở thích, nhịp độ và phương tiện quen thuộc từ chuyến trước.
  - Người dùng có thể giữ nguyên để tạo nhanh hoặc chỉnh sửa lại cho phù hợp chuyến đi mới.

### 7.2. BỎ HOÀN TOÀN tính năng chọn tính cách / giọng điệu AI
- **Xóa bỏ triệt để:** Bỏ toàn bộ các trường chọn Persona (Anh Hai, Chị Ba, Bạn Tư, Rainbow Guide) và chọn Giọng điệu (Friendly, Concise, Playful) trong CSDL, API, Settings UI và Prompt.
- **Phong cách AI duy nhất:** Định hình AI là **"Trợ lý Chuyên gia Du lịch TP.HCM"** (HCMC Travel Expert Assistant) — phong cách giao tiếp chuyên nghiệp, nhiệt tình, am hiểu văn hóa bản địa, chuẩn xác và tập trung vào hiệu quả lịch trình.

### 7.3. Tiêu chí hoàn thành (DoD)
- Không còn bất kỳ UI hay trường dữ liệu nào liên quan đến chọn nhân vật/giọng điệu AI.
- Người dùng cũ mở trang thấy ngay lời chào và form điền sẵn sở thích cũ.
