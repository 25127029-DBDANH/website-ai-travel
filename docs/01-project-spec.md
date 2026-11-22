# 📋 01. Đặc Tả Dự Án, Phạm Vi & Luồng Người Dùng (Project Specification)

> **Tài liệu hợp nhất:** Tổng hợp đặc tả dự án, phạm vi tính năng và luồng trải nghiệm người dùng cho HCMC AI Travel Planner (Sài Gòn Guide).
> *(Lưu ý: Bảng phân công nhiệm vụ 7 thành viên được quản lý tập trung duy nhất tại [`README.md`](../README.md)).*

## Mục lục
- 1. Tổng quan Dự án
- 2. Phạm vi Tính năng (Scope)
- 3. Đặc tả chi tiết các Yêu cầu chính
- 4. Luồng Trải nghiệm Người dùng (User Flow)

---

## 📌 1. Tổng quan Dự án

- **Tên project**: Website AI Lên Lịch Trình Du Lịch TP.HCM (HCMC AI Travel Planner / Sài Gòn Guide)
- **Loại hình**: Đồ án môn học / Đồ án tốt nghiệp, thuyết trình và bảo vệ demo bằng tiếng Anh hoặc tiếng Việt
- **Mô tả cốt lõi**: Ứng dụng web thông minh hỗ trợ lập kế hoạch và đồng hành du lịch tại TP. Hồ Chí Minh. Khách vãng lai có thể mở trang chủ, xem chuyến đi mẫu và tạo lịch trình ngay bằng phiên khách (`x-session-id`), sau đó khi đăng ký/đăng nhập hệ thống tự động chuyển quyền sở hữu (claim) chuyến đi sang tài khoản (**🚧 Đang triển khai (#31)**; hiện tại `POST /api/v1/trips/` vẫn yêu cầu đăng nhập JWT). Người dùng nhập thông tin qua bảng yêu cầu 8 tiêu chí chuyên sâu cho TP.HCM (số ngày, khu vực/quận, ngân sách, sở thích, nhóm người, phương tiện, nhịp độ, ghi chú). Backend AI sử dụng Google Gemini (`google-genai`, biến môi trường `GEMINI_MODEL`, mặc định `gemini-3.5-flash`) với Structured Output JSON trên catalog 327 địa điểm TP.HCM local (tự động seed từ `server/app/db/hcmc_data.py`, tùy chọn làm giàu dữ liệu qua Google Places API (New)), hiển thị trực quan qua bố cục 2 khung hình song song (Bản đồ Leaflet dùng tile OpenStreetMap France ở Khung 1 và Lịch trình Timeline 3 tầng ở Khung 2) cùng 4 chế độ trải nghiệm (Timeline, Đi thực tế Companion, Sổ chi tiêu di chuyển, Tổng kết chuyến đi), hỗ trợ gọi xe 3 hãng (Grab, Xanh SM, Be), kịch bản dự phòng khi trời mưa/kẹt xe (**🚧 Đang triển khai (#8/#18)**) và đồng bộ Google Calendar / xuất `.ICS` (**🚧 Đang triển khai (#18)**).
- **Đối tượng người dùng**: Du khách trong và ngoài nước đến TP.HCM cần lịch trình tối ưu, tránh kẹt xe, tránh mưa ngập và muốn quản lý chuyến đi trực quan trên web/điện thoại.
- **Phạm vi địa lý**: Tập trung 100% vào TP. Hồ Chí Minh (các quận nội thành và khu vực phát triển: Quận 1, Quận 3, Quận 5, Quận 7, Bình Thạnh, Phú Nhuận, TP. Thủ Đức...).
- **Ngôn ngữ giao diện**: Tiếng Việt và Tiếng Anh (chuyển đổi trực tiếp trên thanh điều hướng).

---

## 1.1. Sáu Nguyên tắc Sản phẩm Cốt lõi (Product Principles)

1. **Trải nghiệm ngay không rào cản & Nhận diện liền mạch (Guest-first + Claim — 🚧 Đang triển khai #31):** Theo quyết định ngày 22/11/2026, khách vãng lai được xem Landing Page, nhập form và tạo lịch trình ngay thông qua header `x-session-id`; khi khách đăng ký hoặc đăng nhập, các chuyến đi đang tạo sẽ tự động được claim sang tài khoản để lưu dài hạn, chia sẻ và quản lý trong My Trips. *(Hiện tại `POST /api/v1/trips/` vẫn yêu cầu đăng nhập JWT trong lúc #31 đang hoàn thiện).*
2. **Quy trình Lập kế hoạch Trực quan (Direct-Manipulation UI):** Form 8 tiêu chí chuyên sâu kết hợp AI Engine tối ưu hóa lộ trình (**🚧 Đang triển khai #25** cho phần nối form gọi AI thật), đưa thẳng vào Dashboard 4 Chế độ làm việc trực quan thay vì phải đàm thoại chat thủ công.
3. **Dữ liệu thực tế chống ảo giác (Grounding 100%):** Toàn bộ địa điểm xuất phát từ catalog 327 địa điểm TP.HCM đã chuẩn hóa trong CSDL local (auto-seed khi khởi động), có thể làm giàu thêm ảnh/rating/giờ mở cửa qua Google Places API (New) nếu cấu hình key (có fallback cục bộ), đảm bảo mọi điểm đến đều có tọa độ thật trên bản đồ.
4. **Luôn có phương án dự phòng (Contingency by Default — 🚧 Đang triển khai #8/#18):** Thiết kế riêng cho TP.HCM: sẵn sàng chuyển điểm ngoài trời sang điểm trong nhà khi trời mưa và cảnh báo/cộng thời gian đệm khi gặp kẹt xe giờ cao điểm.
5. **Tiện ích thực tế đến phút cuối (Google Calendar / .ICS — 🚧 Đang triển khai #18):** Lịch trình không chỉ nằm trên web mà có thể xuất file `.ICS` hoặc đồng bộ lên Google Calendar để nhắc giờ trên điện thoại.
6. **Tập trung vào tính chuyên nghiệp (Đã bỏ Persona):** Đã bỏ hoàn toàn tính năng chọn tính cách/giọng điệu AI (Persona). AI hoạt động với một vai trò duy nhất là Trợ lý Chuyên gia Du lịch Bản địa TP.HCM.

---

## 🎯 2. Phạm vi Tính năng (Scope)

| Mức độ ưu tiên | Tính năng (Feature) | Mô tả chi tiết & Trạng thái hiện tại |
|---|---|---|
| **P0 (Bắt buộc)** | **Chế độ Khách (`x-session-id`) & Xác thực JWT** | Khách xem Landing Page kèm form và tạo chuyến bằng `x-session-id`; khi đăng ký/đăng nhập hệ thống tự động claim chuyến của khách sang tài khoản (**🚧 Đang triển khai #31**; hiện tại `POST /api/v1/trips/` vẫn cần đăng nhập). Backend hỗ trợ `username`/`password` với JWT (`OAuth2PasswordBearer`, `HS256`); Google Sign-In, đổi mật khẩu và quên mật khẩu chưa có ở backend. |
| **P0 (Bắt buộc)** | **Bảng nhập yêu cầu 8 tiêu chí TP.HCM** | Thu thập: Số ngày, Quận/khu vực ở TP.HCM, Ngân sách, Sở thích, Nhóm người, Phương tiện, Nhịp độ, Ghi chú đặc biệt. |
| **P0 (Bắt buộc)** | **AI Engine & Đổi địa điểm thông minh** | Backend đã có `/api/v1/ai/concept`, `/api/v1/ai/generate`, `/api/v1/ai/swap` dùng Gemini (`GEMINI_MODEL`, mặc định `gemini-3.5-flash`) với Structured Output JSON trên catalog local và fallback cục bộ. Nối form frontend gọi AI thật: **🚧 Đang triển khai (#25)**; sửa lỗi Gemini bị nuốt im lặng: **🚧 Đang triển khai (#23)**. Nút [Đổi địa điểm] mở Modal 2–3 lựa chọn thay thế và khóa khi đã check-in. |
| **P0 (Bắt buộc)** | **Bố cục 2 khung hình & Bản đồ tương tác** | Khung 1 Bản đồ Leaflet (tile OpenStreetMap France) song song Khung 2 Timeline 3 tầng chống đè chữ; đổi pin thành dấu tích xanh `✓` khi đã check-in; đồng bộ 2 chiều giữa thẻ và marker. |
| **P0 (Bắt buộc)** | **Chế độ Đi thực tế & Gọi xe 3 hãng** | Tab 2 Live Companion: Thẻ Hero chỉ chặng kế tiếp, tích hợp ước tính cước & deep-link gọi xe 3 hãng (Grab, Xanh SM, Be), chụp/tải ảnh check-in lưu qua `PATCH /api/v1/trips/{id}/items/{day}/{order}`. |
| **P0 (Bắt buộc)** | **Sổ chi tiêu có cước xe & Tổng kết chuyến đi** | Tab 3 Sổ chi tiêu cho phép sửa tiền xe inline; Tab 4 Tổng kết KPI, cơ cấu 3 nhóm chi tiêu, album ảnh check-in và xuất Thẻ ảnh kỷ niệm Story Card (9:16). |
| **P0 (Bắt buộc)** | **Lưu, Nhân bản & Chia sẻ lịch trình** | Lưu chuyến đi trong My Trips (`/api/v1/trips/me`), xem chuyến mẫu công khai (`/api/v1/trips/demo`), tạo/thu hồi link chia sẻ chỉ xem (`/s/:token` qua `/api/v1/trips/{id}/share` và `/api/v1/trips/shared/{token}`), nhân bản vào tài khoản (`/api/v1/trips/{id}/clone`, `/api/v1/trips/shared/{token}/clone`). |
| **P1 (Đang hoàn thiện)** | **Phương án dự phòng trời mưa & kẹt xe** | **🚧 Đang triển khai (#8/#18):** UI đã có nút bật chế độ Trời mưa / Giờ cao điểm (chạy logic cục bộ ở client); module backend transit/contingency đang hoàn thiện tại PR #18. |
| **P1 (Đang hoàn thiện)** | **Đồng bộ Google Calendar / Xuất `.ICS`** | **🚧 Đang triển khai (#18):** Module backend calendar đang rỗng trên nhánh chính và đang triển khai ở PR #18. |
| **Chưa triển khai** | **Đánh giá & chấm điểm lịch trình từ AI** | Chưa có kế hoạch triển khai (ngoài phạm vi hiện tại). |
| **ĐÃ BỎ** | **Chọn tính cách / Giọng điệu AI (Persona)** | Đã bỏ hoàn toàn persona; AI giữ duy nhất phong cách Trợ lý Chuyên gia Du lịch TP.HCM. |

---

## 📋 3. ĐẶC TẢ CHI TIẾT CÁC YÊU CẦU CHÍNH

### 1. YÊU CẦU 1: CHẾ ĐỘ KHÁCH (`x-session-id`), XÁC THỰC JWT & CLAIM CHUYẾN ĐI (🚧 Đang triển khai #31)
#### 1.1. Mục tiêu
Cho phép khách vãng lai (Guest) trải nghiệm lập lịch trình ngay từ trang chủ mà không bị chặn bởi màn hình đăng nhập, đồng thời cung cấp hệ thống tài khoản JWT để lưu giữ chuyến đi lâu dài, quản lý trong My Trips và chia sẻ. Khi khách đăng ký hoặc đăng nhập, các chuyến đi tạo trong phiên khách sẽ tự động được claim (chuyển quyền sở hữu) sang tài khoản.

#### 1.2. Người dùng & Luồng thao tác
- **Khách (Guest):**
  - Mở website thấy Landing Page giới thiệu tính năng, danh sách chuyến đi gợi ý (chuyến demo công khai `GET /api/v1/trips/demo`) và **Form tạo lịch trình 8 tiêu chí** ngay trên trang chủ.
  - Tạo lịch trình trực tiếp với header định danh phiên tạm `x-session-id` (**🚧 Đang triển khai #31** — hiện tại trên nhánh chính `POST /api/v1/trips/` vẫn yêu cầu đăng nhập JWT).
  - Khi xem chuyến đi ở chế độ khách, thanh nhắc `SaveTripPrompt` mời đăng ký/đăng nhập để lưu chuyến vĩnh viễn (có nút để sau / ẩn).
- **Phương thức xác thực hiện có ở Backend:**
  - Đăng ký tài khoản nội bộ: `POST /api/v1/auth/register` (`username`, `password`, tùy chọn `display_name`).
  - Đăng nhập tài khoản nội bộ: `POST /api/v1/auth/login` (`username`, `password`) → cấp JWT (`OAuth2PasswordBearer`, ký `HS256` bằng `JWT_SECRET`).
  - Xem thông tin tài khoản hiện tại: `GET /api/v1/auth/me`.
  - Xóa tài khoản: `DELETE /api/v1/auth/me`.
  - *Chưa có ở backend:* Google Sign-In (OAuth 2.0), Đổi mật khẩu và Quên mật khẩu / Đặt lại mật khẩu qua email.
- **Hệ thống xử lý:**
  - Các API tài khoản và quản lý chuyến đi cá nhân (`/api/v1/auth/me`, `/api/v1/trips/me`, `/api/v1/trips/{trip_id}`, `/api/v1/trips/{trip_id}/items/{day}/{order}`, `/api/v1/trips/{trip_id}/share`, `/api/v1/trips/{trip_id}/clone`, `/api/v1/trips/shared/{token}/clone`) xác thực qua `Authorization: Bearer <JWT>`. Thiếu hoặc token không hợp lệ trả `401 Unauthorized`.
  - Các API công khai không cần đăng nhập: `GET /api/v1/trips/demo`, `GET /api/v1/trips/shared/{token}`, các endpoint tra cứu địa điểm `/api/v1/places/*` (`search`, `nearby`, `photo`, `{place_id}`), `GET /` và `GET /health`.
  - Cơ chế tạo chuyến đi bằng `x-session-id` cho khách và tự động claim sang `user_id` khi đăng ký/đăng nhập (trả về số lượng `claimed_trips` trong `AuthResponse`): **🚧 Đang triển khai (#31)**.

#### 1.3. Đầu vào & Đầu ra
- **Đầu vào:** `username`, `password` (và header `x-session-id` khi khách tạo chuyến hoặc claim chuyến lúc đăng ký/đăng nhập — 🚧 #31).
- **Đầu ra:** `token` (JWT), `user` profile (`id`, `username`, `display_name`), `claimed_trips` (số chuyến khách được gán vào tài khoản).

#### 1.4. Trường hợp lỗi
- Nhập sai tên đăng nhập hoặc mật khẩu: Báo lỗi chung *"Tên đăng nhập hoặc mật khẩu không chính xác"* (tránh lộ thông tin tài khoản).
- Token hết hạn hoặc không hợp lệ: Trả `401 Unauthorized`, xóa phiên cục bộ và yêu cầu đăng nhập lại.

#### 1.5. Tiêu chí hoàn thành (DoD)
- Khách vãng lai có thể nhập form và tạo chuyến đi bằng `x-session-id`; khi đăng ký/đăng nhập, các chuyến đi đó tự động chuyển sang tài khoản (`claimed_trips >= 0`) (**🚧 Đang triển khai #31**).
- Các chuyến đi đã lưu trong My Trips, tính năng chia sẻ và xóa tài khoản được bảo vệ chặt chẽ theo `user_id` qua JWT.

---

### 2. YÊU CẦU 2: BẢNG NHẬP YÊU CẦU 8 TIÊU CHÍ & LUỒNG 4 BƯỚC AI / SMART SWAP
#### 2.1. Mục tiêu
Thiết lập quy trình thu thập thông tin du lịch toàn diện tại TP.HCM và vận hành luồng lập kế hoạch có cấu trúc chặt chẽ: Form → AI gợi ý định hướng (Concept) → Người dùng duyệt → AI sinh lịch trình chi tiết, kèm cơ chế đổi địa điểm linh hoạt (Smart Swap).

#### 2.2. Bảng nhập yêu cầu (8 trường thông tin đặc thù TP.HCM)
1. **Số ngày:** 1 đến 14 ngày.
2. **Khu vực / Quận ở TP.HCM:** Chọn khu vực xuất phát/ưu tiên (Quận 1, Quận 3, Quận 5 - Chợ Lớn, Thảo Điền - TP. Thủ Đức, Bình Thạnh, Phú Nhuận...).
3. **Ngân sách:** Tổng ngân sách dự kiến (VND) với các mốc gợi ý nhanh.
4. **Sở thích du lịch:** Ẩm thực đường phố, cà phê specialty, di tích/văn hóa, mua sắm, thiên nhiên/công viên, giải trí về đêm (nightlife).
5. **Nhóm người đi cùng:** Đi một mình (Solo), Cặp đôi (Couple), Nhóm bạn (Friends), Gia đình (Family).
6. **Phương tiện di chuyển:** Xe máy / GrabBike, Ô tô / GrabCar, Metro & Đi bộ.
7. **Nhịp độ chuyến đi (Pace):** Thong thả (Relaxed), Cân bằng (Moderate), Khám phá tối đa (Packed).
8. **Ghi chú đặc biệt (Special notes):** Ưu tiên máy lạnh/trong nhà, ăn chay, không ăn cay, hạn chế đi bộ xa...

#### 2.3. Luồng 4 bước AI & Trạng thái tích hợp
1. **Bước 1 (Submit Form 8 tiêu chí):** Người dùng nhập form 8 tiêu chí ngay trên trang chủ và gửi yêu cầu.
2. **Bước 2 (AI Phân tích & Gợi ý Concept — `POST /api/v1/ai/concept`):** AI phân tích sở thích, ngân sách và đề xuất tóm tắt định hướng chuyến đi (Concept, điểm nhấn ẩm thực/di sản).
3. **Bước 3 (Người dùng Xác nhận — 🚧 Đang triển khai #25):** Người dùng xem và duyệt concept hoặc tinh chỉnh nhanh tiêu chí trước khi tạo lịch trình chi tiết.
4. **Bước 4 (Sinh Lịch trình Chi tiết — `POST /api/v1/ai/generate` & Đưa vào Dashboard 4 Chế độ):** AI sử dụng Google Gemini (`google-genai`, model đọc từ `GEMINI_MODEL`, mặc định `gemini-3.5-flash`) với Structured Output JSON trên catalog 327 địa điểm TP.HCM local (có fallback cục bộ khi lỗi), sinh lịch trình theo từng khung giờ và hiển thị trực quan trên Dashboard 4 Chế độ làm việc.

> **Trạng thái triển khai hiện tại:**
> - Backend đã hoàn thiện 3 endpoint `/api/v1/ai/concept`, `/api/v1/ai/generate`, `/api/v1/ai/swap` trong `gemini_service.py` (kèm fallback cục bộ).
> - **🚧 Đang triển khai (#25):** Nối form tạo lịch trình frontend (`TripForm.jsx`) với luồng 4 bước AI backend (hiện form vẫn đang dùng logic sinh lịch trình cục bộ ở client, chưa gọi `/api/v1/ai/*`).
> - **🚧 Đang triển khai (#23):** Xử lý minh bạch lỗi từ Gemini thay vì nuốt lỗi im lặng khi chuyển sang fallback.

#### 2.4. Xử lý Đổi địa điểm Thông minh (AI Smart Swap)
- Trên mỗi thẻ địa điểm trong Lịch trình Khung 2 có nút **[🔄 Đổi địa điểm]**.
- Khi bấm nút:
  - Hệ thống tìm 2–3 lựa chọn thay thế tương đương cùng khu vực/loại hình (backend hỗ trợ `POST /api/v1/ai/swap` và `GET /api/v1/places/nearby`; nối hoàn chỉnh Smart Swap qua AI backend thuộc **🚧 Đang triển khai #25**).
  - Hiển thị các lựa chọn thay thế (kèm thông tin, giá ước tính, lý do gợi ý) trong cửa sổ Modal trực quan.
  - Người dùng bấm chọn 1 phương án → hệ thống cập nhật lại lịch trình và ngân sách tổng thể.
  - *Lưu ý logic:* Khi một chặng đã hoàn tất check-in (`visited === true`), nút Đổi địa điểm bị **khóa hoàn toàn** để đảm bảo tính logic thực tế.

#### 2.5. Tiêu chí hoàn thành (DoD)
- Form nhập đầy đủ 8 trường thông tin đặc thù TP.HCM.
- Form nối hoàn chỉnh với `/api/v1/ai/concept` và `/api/v1/ai/generate`, báo lỗi rõ ràng khi Gemini gặp sự cố (**🚧 #25**, **🚧 #23**).
- Đổi địa điểm thành công với 2–3 gợi ý qua Modal mà không làm gãy cấu trúc lịch trình.

---

### 3. YÊU CẦU 3: BẢN ĐỒ TƯƠNG TÁC KHUNG 1 SONG SONG LỊCH TRÌNH KHUNG 2
#### 3.1. Mục tiêu
Trực quan hóa không gian địa lý, hiển thị chính xác vị trí các điểm đến tại TP.HCM trên bản đồ số tương tác (Leaflet), đặt song song đồng thời với Lịch trình Timeline mà không cần cuộn trang hay chuyển tab qua lại.

#### 3.2. Chức năng cụ thể
- **Bố cục 2 Khung hình Song song:**
  - *Khung 1 (Bên trái):* Bản đồ Leaflet sử dụng lớp nền tile **OpenStreetMap France** (tránh tình trạng DNS VNPT chặn `tile.openstreetmap.org`), hiển thị các Marker đánh số thứ tự (1, 2, 3...) kết nối bằng đường polyline thể hiện lộ trình trong ngày.
  - *Khung 2 (Bên phải):* Lịch trình Timeline chi tiết theo cấu trúc thẻ 3 tầng chống đè chữ.
- **Tương tác trên bản đồ:** Click vào từng Marker để xem Pop-up thông tin địa điểm (tên, địa chỉ, khung giờ, chi phí ước tính).
- **Cập nhật trạng thái Ghé thăm thời gian thực:** Khi người dùng check-in một điểm, Marker trên bản đồ tự động chuyển từ số thứ tự thành **dấu tích xanh `✓`**.
- **Đồng bộ hai chiều (Bi-directional Sync):** Click vào thẻ địa điểm trên Timeline thì bản đồ tự động Pan/Zoom tới Marker tương ứng; ngược lại, click vào Marker trên bản đồ thì Timeline tự cuộn và làm nổi bật đúng thẻ.

#### 3.3. Tiêu chí hoàn thành (DoD)
- 100% địa điểm trong lịch trình có tọa độ `(lat, lng)` hiển thị chính xác trên bản đồ.
- Bản đồ tải ổn định tại mạng Việt Nam (OSM France), đồng bộ 2 chiều mượt mà và đổi marker sang dấu tích xanh `✓` khi đã check-in.

---

### 4. YÊU CẦU 4: PHƯƠNG ÁN DỰ PHÒNG THÔNG MINH (CONTINGENCY PLANNING — 🚧 Đang triển khai #8/#18)
#### 4.1. Mục tiêu
Giúp người dùng chủ động thích ứng với các sự cố thực tế thường gặp khi du lịch TP.HCM: trời mưa lớn ngập đường, kẹt xe giờ cao điểm, địa điểm đóng cửa hoặc chi tiêu vượt ngân sách.

#### 4.2. Các kịch bản dự phòng
1. **Trời mưa / Thời tiết xấu (🚧 Đang triển khai #8/#18):**
   - Kích hoạt bằng nút nhanh trên thanh công cụ lịch trình.
   - Đổi các điểm tham quan ngoài trời sang các địa điểm trong nhà có mái che (dựa trên cờ `is_indoor` trong catalog địa điểm, hỗ trợ lọc qua `GET /api/v1/places/search?is_indoor=true`) và điều chỉnh phương tiện sang GrabCar.
2. **Kẹt xe giờ cao điểm 17:00 – 19:00 (🚧 Đang triển khai #8/#18):**
   - Cảnh báo các khung giờ/điểm nóng giao thông và cộng thời gian đệm (+20 phút) cho chặng di chuyển.
3. **Địa điểm đóng cửa / Hết bàn (🚧 Đang triển khai #8/#18):**
   - Gợi ý điểm thay thế lân cận (`GET /api/v1/places/nearby`) cùng nhóm trải nghiệm.
4. **Vượt ngân sách (Over Budget):**
   - Cảnh báo khi tổng chi phí vượt ngân sách dự trù và đề xuất đổi sang lựa chọn tiết kiệm hơn.

> **Trạng thái hiện tại:** Giao diện `TripPage.jsx` đã có các nút thử nghiệm chế độ Trời mưa, Giờ cao điểm và Tối ưu ngân sách (đang xử lý cục bộ trên client); các module backend transit/contingency trên nhánh `main` đang rỗng và đang được phát triển ở **PR #18 (🚧 #8/#18)**.

#### 4.3. Tiêu chí hoàn thành (DoD)
- Hoàn thiện API transit/contingency phía backend và kết nối với nút kích hoạt trên giao diện (**🚧 #8/#18**).

---

### 5. YÊU CẦU 5: LƯU & CHIA SẺ LỊCH TRÌNH CHUYÊN NGHIỆP
#### 5.1. Mục tiêu
Cung cấp kho lưu trữ chuyến đi cá nhân rõ ràng trong tài khoản và hỗ trợ chia sẻ lịch trình qua liên kết công khai chỉ xem có thể thu hồi bất kỳ lúc nào.

#### 5.2. Chức năng cụ thể
1. **Lưu & Quản lý chuyến đi (My Trips):**
   - Danh sách chuyến đi cá nhân tải từ `GET /api/v1/trips/me`, lưu trữ chi tiết hành trình trong cột `itinerary_json` của bảng `trips`.
   - Hỗ trợ xem chi tiết (`GET /api/v1/trips/{trip_id}`), cập nhật (`PUT /api/v1/trips/{trip_id}`), nhân bản (`POST /api/v1/trips/{trip_id}/clone`) và xóa (`DELETE /api/v1/trips/{trip_id}`).
2. **Chia sẻ lịch trình công khai chỉ xem:**
   - Tạo link chia sẻ `/s/:token` qua `POST /api/v1/trips/{trip_id}/share` và thu hồi link qua `DELETE /api/v1/trips/{trip_id}/share`.
   - Người nhận mở link xem lịch trình không cần đăng nhập (`GET /api/v1/trips/shared/{token}`) và có nút **[Sao chép vào tài khoản của tôi]** (`POST /api/v1/trips/shared/{token}/clone`, yêu cầu đăng nhập JWT) để tự tùy biến.
3. **Đánh giá & chấm điểm lịch trình từ AI:** *Chưa có kế hoạch triển khai (ngoài phạm vi hiện tại).*

#### 5.3. Tiêu chí hoàn thành (DoD)
- CRUD chuyến đi hoạt động đầy đủ qua `/api/v1/trips/*`.
- Tạo, mở công khai, thu hồi và nhân bản link chia sẻ `/s/:token` hoạt động chính xác qua `/api/v1/trips/{trip_id}/share` và `/api/v1/trips/shared/{token}`.

---

### 6. YÊU CẦU 6: TÍCH HỢP GOOGLE CALENDAR / XUẤT `.ICS` (🚧 Đang triển khai #18)
#### 6.1. Mục tiêu
Cho phép người dùng xuất lịch trình dưới định dạng `.ICS` hoặc đồng bộ các chặng tham quan lên Google Calendar theo ngày bắt đầu chuyến đi để nhận nhắc giờ trên điện thoại.

#### 6.2. Luồng thao tác dự kiến
1. Trên màn hình lịch trình hoàn chỉnh, người dùng bấm nút **[📅 Đồng bộ Calendar / Xuất .ICS]**.
2. Chọn ngày bắt đầu chuyến đi và xác nhận xuất file `.ICS` (hoặc cấp quyền OAuth Google Calendar khi hoàn thiện tích hợp).
3. Mỗi chặng trong lịch trình được chuyển thành một sự kiện gồm tên địa điểm, khung giờ, địa chỉ, chi phí dự kiến và nhắc trước 30 phút.

> **Trạng thái hiện tại:** Module backend calendar trên nhánh `main` đang rỗng và đang được triển khai tại **PR #18 (🚧 #18)**.

#### 6.3. Tiêu chí hoàn thành (DoD)
- Xuất file `.ICS` hợp lệ hoặc đồng bộ thành công sự kiện lên Google Calendar đúng ngày giờ và địa điểm (**🚧 #18**).

---

### 7. YÊU CẦU 7: QUẢN LÝ CHUYẾN ĐI CŨ & BỎ HOÀN TOÀN PERSONA
#### 7.1. Quản lý lịch sử chuyến đi của người dùng
- Người dùng đã đăng nhập có thể xem lại toàn bộ các chuyến đi đã tạo, mở lại để tiếp tục đồng hành, nhân bản hoặc chia sẻ trong trang **My Trips** (`/trips` gọi `GET /api/v1/trips/me`).
- *Lưu ý:* Tính năng tự động ghi nhớ hồ sơ sở thích và điền sẵn form từ chuyến trước (auto pre-fill) chưa được triển khai ở backend.

#### 7.2. Đã bỏ hoàn toàn tính năng chọn tính cách / giọng điệu AI (Persona)
- Dự án **đã bỏ hoàn toàn** tính năng chọn Persona và giọng điệu AI.
- AI giữ duy nhất một phong cách là **Trợ lý Chuyên gia Du lịch TP.HCM** — ngắn gọn, chính xác, am hiểu địa phương và tập trung vào chất lượng lịch trình.

---

### 8. YÊU CẦU NÂNG CẤP: 4 CHẾ ĐỘ TRẢI NGHIỆM, ĐỒNG HÀNH THỜI GIAN THỰC & TỔNG KẾT CHUYẾN ĐI (COMPANION ECOSYSTEM)

#### 8.1. Bố cục 2 Khung hình Song song & Thiết kế Thẻ 3 tầng (Anti-overlap Layout)
- **Khung 1 (Bản đồ Leaflet tương tác):** Hiển thị lộ trình trong ngày với Marker đánh số `[1, 2, 3, 4]` nối bằng polyline; khi chặng đã check-in (`visited === true`), marker tự động chuyển thành **dấu tích xanh `✓`**.
- **Khung 2 (Lịch trình Timeline 3 tầng):**
  - *Tầng 1 (Header):* Khung giờ hoạt động bên trái + Dự toán chi phí cố định góc phải.
  - *Tầng 2 (Content):* Tên địa điểm chiếm 100% bề ngang, không bị đè chữ, kèm mô tả ngắn và badge thể loại.
  - *Tầng 3 (Action Bar):* Nút Chốt điểm (Accept), nút Đổi điểm (Swap), nút Xem chi tiết.
  - Khi chặng đã hoàn thành: Tô màu xanh lá êm dịu, hiện huy hiệu `[✓ Chặng đã hoàn tất]`, không gạch ngang tên địa điểm (`line-through`) và khóa nút đổi điểm.

#### 8.2. Chế độ Đi thực tế thời gian thực (Tab 2: Live Companion)
- **Thẻ Hero "Điểm đến tiếp theo":** Tự động phát hiện chặng sắp đến, hiển thị tên, địa chỉ, khoảng cách và thời lượng dự kiến.
- **Tích hợp 3 ứng dụng gọi xe tại TP.HCM:** Hỗ trợ lựa chọn **Grab (GrabBike / GrabCar)**, **Xanh SM**, và **Be (BeBike / BeCar)** kèm ước tính cước phí và deep-link mở ứng dụng.
- **Nút "Chỉ đường" (Google Maps):** Mở dẫn đường chi tiết tới tọa độ điểm đến.
- **Nút "Chụp ảnh Check-in":** Chụp ảnh hoặc tải ảnh từ máy, đánh dấu hoàn thành chặng và lưu qua `PATCH /api/v1/trips/{trip_id}/items/{day_number}/{order_index}`.
- **Nút "Hoàn thành chuyến đi":** Chuyển nhanh sang màn hình Tổng kết chuyến đi.

#### 8.3. Sổ Chi tiêu & Di chuyển Chi tiết (Tab 3: Expense Tracker)
- Quản lý 3 hạng mục: Vé tham quan, Ăn uống/ẩm thực và Cước xe di chuyển giữa các chặng.
- **Chỉnh sửa Cước xe trực tiếp (Inline Fare Editing):** Nhấp trực tiếp vào số tiền cước xe thực tế để cập nhật vào sổ chi tiêu.
- Bộ lọc danh mục và thanh tiến độ ngân sách kèm cảnh báo màu khi vượt ngân sách.

#### 8.4. Giao diện Tổng kết Chuyến đi & Xuất Thẻ Kỷ niệm (Tab 4: Trip Summary Dashboard)
- **Bảng chỉ số KPI:** Số ngày khám phá, Số điểm đã ghé thăm, Tổng số tiền thực chi so với dự trù.
- **Biểu đồ cơ cấu 3 nhóm chi tiêu:** Hoạt động – Ăn uống – Di chuyển.
- **Dòng thời gian lịch sử & Album ảnh check-in:** Xem lại lộ trình từng ngày và toàn bộ ảnh đã lưu.
- **Xuất Thẻ ảnh kỷ niệm (Story Card Canvas):** Vẽ ảnh tổng kết chuyến đi (tỷ lệ 9:16 Story) để tải về máy chia sẻ mạng xã hội.

---

## 🗺️ 4. LUỒNG TRẢI NGHIỆM NGƯỜI DÙNG (USER FLOW)

### 4.1. Sơ đồ luồng tổng thể (Mermaid User Flow)

```mermaid
flowchart TD
    Start([Người dùng mở Website]) --> LandingPage[Landing Page: Giới thiệu, Chuyến mẫu /api/v1/trips/demo & Form 8 tiêu chí]

    %% Nhánh Đăng nhập / Khách
    LandingPage --> Choice{Tạo chuyến ngay hay Đăng nhập?}
    Choice -- Đăng nhập / Đăng ký --> AuthModal[Đăng nhập / Đăng ký Username & Password -> Cấp JWT]
    AuthModal --> ClaimTrips["Tự động Claim chuyến của khách nếu có x-session-id (🚧 #31)"]
    ClaimTrips --> FillForm[Nhập 8 tiêu chí TP.HCM trên Form]

    Choice -- "Trải nghiệm Khách (x-session-id, 🚧 #31)" --> FillForm

    %% Luồng tạo lịch trình
    FillForm --> SubmitForm[Bấm 'Tạo lịch trình']
    SubmitForm --> AIEngine["AI Engine: Gemini (GEMINI_MODEL mặc định gemini-3.5-flash)\nCatalog 327 địa điểm local (Nối form: 🚧 #25)"]
    AIEngine --> MainDashboard[Điều hướng vào Dashboard 4 Chế Độ (/trip/:id)]

    %% Nhắc lưu cho khách
    MainDashboard --> GuestCheck{Đang là Khách?}
    GuestCheck -- Có --> SavePrompt["Hiện banner SaveTripPrompt mời đăng ký/đăng nhập để Claim (🚧 #31)"]
    SavePrompt --> AuthModal

    %% 4 Chế độ làm việc
    MainDashboard --> Tab1[TAB 1: LỊCH TRÌNH TIMELINE\nKhung 1 Bản đồ Leaflet OSM France + Khung 2 Timeline 3 tầng]
    MainDashboard --> Tab2[TAB 2: ĐI THỰC TẾ COMPANION\nHero chỉ chặng, Chỉ đường, Đặt xe Grab/Xanh SM/Be, Check-in]
    MainDashboard --> Tab3[TAB 3: SỔ CHI TIÊU & DI CHUYỂN\nVé, Ẩm thực & Cước xe từng chặng, Sửa tiền inline]
    MainDashboard --> Tab4[TAB 4: TỔNG KẾT CHUYẾN ĐI\nKPIs, Cơ cấu 3 nhóm tiền, Album ảnh, Xuất Story Card Canvas]

    %% Tương tác Tab 1
    Tab1 --> ActionAccept[Bấm 'Accept' -> Chốt điểm tham quan]
    Tab1 --> ActionSwap{Muốn đổi địa điểm?}
    ActionSwap -- Có --> ClickSwap[Bấm 'Đổi địa điểm' -> Mở Modal Smart Swap]
    ClickSwap --> SelectSwap[Chọn 1 trong 2-3 điểm thay thế tương đương]
    SelectSwap --> Tab1

    Tab1 --> ActionContingency{"Trời mưa / Giờ cao điểm? (🚧 #8/#18)"}
    ActionContingency -- Có --> ClickContingency[Bấm 'Trời mưa' / 'Giờ cao điểm']
    ClickContingency --> AIAdapt[Chuyển điểm trong nhà / cộng đệm +20p]
    AIAdapt --> Tab1

    %% Tương tác Tab 2
    Tab2 --> ActionRide[Bấm 'Đặt xe di chuyển' -> Chọn Grab / Xanh SM / Be]
    Tab2 --> ActionCheckin["Check-in & tải ảnh (PATCH /api/v1/trips/{id}/items/{day}/{order})"]
    ActionCheckin --> SyncVisited[Bản đồ Khung 1 đổi pin thành tích xanh ✓ & Khóa nút đổi điểm]
    SyncVisited --> Tab2
    Tab2 --> ActionFinish[Bấm 'Hoàn thành chuyến đi']
    ActionFinish --> Tab4

    %% Tương tác Tab 3 & Tab 4
    Tab3 --> ActionEditFare[Nhấp số tiền cước xe -> Sửa cước thực chi inline]
    Tab4 --> ActionExportCard[Bấm 'Xuất Thẻ ảnh kỷ niệm' -> Tải ảnh Story Card 9:16]
    Tab1 --> ActionCalendar["Bấm 'Đồng bộ Calendar / Xuất .ICS' (🚧 #18)"]
    Tab1 --> ActionShare["Bấm 'Chia sẻ' -> Tạo link /s/:token (POST /api/v1/trips/{id}/share)"]
```

---

### 4.2. Mô tả chi tiết từng giai đoạn trải nghiệm

#### Giai đoạn 1: Tiếp cận, Trải nghiệm Khách & Xác thực JWT (🚧 Đang triển khai #31)
- **Khách truy cập:** Xem giao diện Landing Page (Hero, giới thiệu cách hoạt động, các chuyến đi gợi ý mẫu tải từ `GET /api/v1/trips/demo` và **Form lập lịch trình 8 tiêu chí** ngay tại `#plan`).
- **Tạo chuyến không rào cản:** Khách có thể nhập form và tạo lịch trình bằng header `x-session-id` (**🚧 Đang triển khai #31**; hiện tại `POST /api/v1/trips/` vẫn yêu cầu đăng nhập JWT). Khi mở màn hình chuyến đi ở chế độ khách, thanh `SaveTripPrompt` gợi ý đăng ký/đăng nhập để lưu giữ lâu dài.
- **Đăng ký / Đăng nhập & Claim:** Đăng ký (`POST /api/v1/auth/register`) hoặc đăng nhập (`POST /api/v1/auth/login`) bằng Username/Password để nhận JWT (`HS256`). Hệ thống tự động claim các chuyến đi của phiên `x-session-id` vào tài khoản (**🚧 Đang triển khai #31**).

#### Giai đoạn 2: Khảo sát Nhu cầu Du lịch (8 Tiêu chí Đặc thù TP.HCM)
- Người dùng tương tác trực tiếp với **Form 8 tiêu chí** (`TripForm.jsx`):
  1. Số ngày (1 – 14 ngày)
  2. Khu vực / Quận ưu tiên tại TP.HCM
  3. Ngân sách dự trù (VND)
  4. Sở thích cốt lõi (ẩm thực đường phố, di tích lịch sử, cà phê specialty, mua sắm, thiên nhiên, nightlife)
  5. Nhóm người đi cùng (Solo, Cặp đôi, Nhóm bạn, Gia đình)
  6. Phương tiện di chuyển ưu tiên (Xe máy/GrabBike, Ô tô/GrabCar, Metro & Đi bộ)
  7. Nhịp độ chuyến đi (Thong thả, Cân bằng, Khám phá tối đa)
  8. Ghi chú cá nhân đặc biệt.

#### Giai đoạn 3: AI Engine Tối ưu hóa & Đưa vào Dashboard
- Khi bấm tạo lịch trình, AI Engine sử dụng **Google Gemini** (`google-genai`, model đọc từ biến môi trường `GEMINI_MODEL`, mặc định `gemini-3.5-flash`) với Structured Output JSON trên catalog 327 địa điểm TP.HCM local (có fallback cục bộ) để đề xuất concept (`/api/v1/ai/concept`) và sinh lịch trình chi tiết (`/api/v1/ai/generate`).
- **Trạng thái hiện tại:** Phần nối form frontend gọi AI backend đang triển khai (**🚧 Đang triển khai #25**), và xử lý báo lỗi Gemini rõ ràng thay vì nuốt lỗi im lặng đang triển khai (**🚧 Đang triển khai #23**).
- Sau khi tạo xong, hệ thống điều hướng vào **Màn hình Chuyến đi (`/trip/:id`)** với **4 Chế độ Trải nghiệm** trực quan.

#### Giai đoạn 4: Tinh chỉnh Lịch trình Trực quan (Tab 1: Lịch trình Timeline)
- **Bố cục 2 Khung hình Song song:**
  - *Khung 1 (Bản đồ tương tác):* Bản đồ Leaflet (tile OpenStreetMap France) vẽ lộ trình các chặng `[1, 2, 3, 4]` trong ngày.
  - *Khung 2 (Lịch trình 3 tầng):* Hiển thị thời gian biểu, tên địa điểm không bị đè chữ, nút *Accept* chốt điểm và nút *Đổi địa điểm (Smart Swap)* mở Modal chọn 2–3 điểm thay thế.
- **Kịch bản thích ứng (🚧 Đang triển khai #8/#18):** Nút *[Trời mưa]* / *[Giờ cao điểm]* chuyển điểm ngoài trời sang điểm trong nhà có mái che hoặc cộng thời gian đệm kẹt xe.

#### Giai đoạn 5: Đồng hành Thực địa Ngoài đường (Tab 2: Chế độ Đi thực tế Companion)
- **Thẻ Hero:** Chỉ đường đến chặng kế tiếp, khoảng cách và thời lượng ước tính.
- **Gọi xe công nghệ 3 hãng:** Mở hộp chọn hiển thị cước ước tính và deep-link mở ứng dụng **Grab**, **Xanh SM**, hoặc **Be**.
- **Check-in chụp ảnh:** Du khách chụp/tải ảnh tại điểm đến → lưu trạng thái qua `PATCH /api/v1/trips/{trip_id}/items/{day_number}/{order_index}`, chặng chuyển sang `[✓ Đã hoàn thành]`, Bản đồ Khung 1 đổi pin thành dấu tích xanh `✓` và nút đổi điểm bị khóa.

#### Giai đoạn 6: Quản lý Chi tiêu, Tổng kết Kỷ niệm & Chia sẻ (Tab 3 & Tab 4)
- **Tab 3 (Sổ chi tiêu):** Quản lý chi phí vé, ẩm thực và cước xe từng chặng, hỗ trợ nhấp sửa cước xe thực chi trực tiếp (*inline editing*).
- **Tab 4 (Tổng kết chuyến đi):** Thống kê KPI, cơ cấu 3 nhóm chi tiêu và album ảnh check-in thực tế.
- **Xuất Thẻ ảnh kỷ niệm (Story Card):** Vẽ ảnh đồ họa Canvas tổng kết chuyến đi (tỷ lệ 9:16) để tải về máy.
- **Chia sẻ & Lịch:** Tạo/thu hồi link chia sẻ `/s/:token` (`POST`/`DELETE /api/v1/trips/{trip_id}/share`), nhân bản vào tài khoản (`POST /api/v1/trips/shared/{token}/clone`); đồng bộ Google Calendar / xuất `.ICS` (**🚧 Đang triển khai #18**).
