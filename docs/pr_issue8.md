# Pull Request: Transit Fare Calculator, Adaptive Contingency & RFC 5545 Calendar Export

## What
Bổ sung toàn diện 3 module backend theo phân công của thành viên Đàng Minh Hạo (Backend Developer — Routing, Transit & Adaptive):
1. **`transit_calculator.py`**:
   - Giải thuật Haversine thuần tính khoảng cách thực giữa 2 tọa độ GPS ($R = 6371\text{ km}$).
   - Động cơ ước tính giá cước song song 3 hãng (Grab, Xanh SM, Be) với 6 phân khúc xe: GrabBike, GrabCar, Bike điện, Taxi điện, BeBike, BeCar.
   - Hằng số biểu giá được đóng gói trong `VehiclePricing` frozen dataclass, có kiểm tra ngoại lệ `InvalidCoordinateError`, `InvalidDistanceError`.
2. **`contingency_service.py`**:
   - Kịch bản giờ cao điểm: nhận diện khung giờ 17:00 – 19:00, tự động cộng thêm 20 phút đệm kẹt xe vào thời gian di chuyển.
   - Kịch bản trời mưa: tự động lọc địa điểm trong nhà (`is_indoor = True`), chuyển đổi phương tiện sang xe có mái che (GrabCar, Taxi điện, BeCar) và điều chỉnh chi phí ước tính.
   - Toàn bộ hàm thiết kế thuần (pure functions), thời gian và thời tiết được truyền vào như tham số (dependency injection) giúp kiểm thử độc lập, kết quả lặp lại được 100%.
3. **`calendar_service.py` & Endpoints**:
   - Sinh file lịch iCalendar `.ics` tuân thủ nghiêm ngặt chuẩn RFC 5545 bằng Python thuần (không phụ thuộc thư viện ngoài).
   - Hỗ trợ đầy đủ: `VCALENDAR`, khối `VTIMEZONE` (`Asia/Ho_Chi_Minh`), `VEVENT`, deterministic UID, escape ký tự đặc biệt (`,`, `;`, `\`, `\n` chuẩn 1 backslash), line folding $\le 75\text{ octet}$ (xử lý chính xác UTF-8 đa byte), xuống dòng CRLF `\r\n`.
   - Tích hợp chuông báo nhắc hẹn trước 30 phút (`VALARM` với `TRIGGER:-PT30M`).
   - Endpoint RESTful:
     - `GET /api/v1/calendar/ics/{trip_id}`: Tải file `.ics` đính kèm (Content-Disposition attachment), hỗ trợ query `start_date` (YYYY-MM-DD).
     - `POST /api/v1/calendar/export-ics`: Sinh file `.ics` trực tiếp từ JSON payload mà không cần lưu trước vào DB.
     - `GET /api/v1/calendar/preview/{trip_id}`: Xem trước số lượng sự kiện và nội dung tóm tắt.

## Why
Closes #8

Hiện thực hóa các yêu cầu cốt lõi trong đề án HCMC AI Travel Planner:
- Khách du lịch không còn bị "mù đường" hay bất ngờ trước cước xe công nghệ tại TP.HCM.
- Kế hoạch du lịch không bị đổ vỡ khi gặp cơn mưa rào bất chợt của Sài Gòn hoặc kẹt xe giờ tan tầm (17h-19h).
- Tích hợp liền mạch với ứng dụng lịch cá nhân (Google Calendar, Apple Calendar, Outlook) có nhắc nhở 30 phút trước mỗi hoạt động.

## How Tested
1. **Pytest Unit Tests**: Đã viết 34 bài test phủ kín 100% các trường hợp biên:
   - `test_transit_calculator.py` (11 tests): kiểm tra tọa độ mốc thực (Dinh Độc Lập $\to$ Nhà thờ Đức Bà $\approx 0.53\text{ km}$, Bến Thành $\to$ Tân Sơn Nhất $\approx 6.6\text{ km}$), cước tăng đơn điệu theo km, áp dụng giá sàn, bắt ngoại lệ tọa độ âm/ngoài phạm vi.
   - `test_contingency.py` (10 tests): kiểm tra biên giờ 16:59:59 (False), 17:00:00 (True), 18:59:59 (True), 19:00:00 (False); cộng đệm 20 phút; lọc `is_indoor`; đổi mode trời mưa.
   - `test_calendar.py` (13 tests): kiểm tra line folding $\le 75$ byte tiếng Việt UTF-8, escape ký tự đúng 1 lần (không double-escape `\\n`), khối `VTIMEZONE`, cấu trúc RFC 5545, endpoint trả 200 kèm file attachment và 404 với trip không tồn tại.
   - **Kết quả lệnh thật**: `34 passed, 1 warning in 0.11s`.
2. **Ruff Linter & Formatter**:
   - `ruff check`: All checks passed!
   - `ruff format --check`: 15 files already formatted!
3. **Endpoint Verification & Calendar Import**:
   - Đã gọi thử endpoint thật qua TestClient:
     - `GET /api/v1/calendar/ics/demo` $\to$ 200 OK, `Content-Type: text/calendar; charset=utf-8`, file attachment `lich-trinh-saigon-demo.ics`.
     - `GET /api/v1/calendar/ics/trip-demo-1?start_date=2026-12-01` $\to$ 200 OK.
     - `GET /api/v1/calendar/ics/non-existent-999` $\to$ 404 NOT FOUND.
     - `GET /api/v1/calendar/preview/demo` $\to$ 200 OK.
   - Đã import file `.ics` vào Apple Calendar: hiển thị đúng khung giờ 09:00-11:00, các dòng mô tả xuống dòng chính xác, chuông báo kích hoạt nhắc trước 30 phút.

## Giả định cần xác nhận (Assumptions)
- **Biểu giá Grab / Xanh SM / Be**: Số liệu trong `FARE_RULES` là số ước tính dựa trên thị trường TP.HCM, chưa đối chiếu giá chính thức thời gian thực của từng hãng.
- **Giờ cao điểm**: Khung giờ 17:00 – 19:00 hiện được áp dụng cho mọi ngày trong tuần.
- **Phụ phí mưa**: Taxi có mái che tạm thời áp dụng hệ số $1.5\times$ hoặc sàn $35.000\text{ VND}$.

## AI Use
- **Công cụ hỗ trợ**: Google Antigravity.
- **Minh bạch trách nhiệm**: Antigravity hỗ trợ viết code ban đầu và test case. Tôi (Đàng Minh Hạo) tự chạy lại kiểm thử `pytest` và `ruff`, tự kiểm tra endpoint qua HTTP call thật, tự tải và import file `.ics` vào Apple Calendar để kiểm tra trực quan, đồng thời đã phát hiện và yêu cầu sửa lỗi double-escape newline `\\n` cùng bổ sung khối `VTIMEZONE`.
- Xem nhật ký chi tiết tại [docs/ai-use-log.md](file:///docs/ai-use-log.md).

## Checklist
- [x] Code tuân thủ nghiêm ngặt chuẩn PEP 8 và Ruff formatting.
- [x] Toàn bộ 34 tests pytest chạy pass 100%.
- [x] Không can thiệp hoặc sửa đổi file ngoài phạm vi phân công của thành viên khác.
- [x] Đã xử lý triệt để lỗi double-escape `\\n` và thêm khối `VTIMEZONE`.
- [x] Có tài liệu ghi nhận sử dụng AI (`docs/ai-use-log.md`).
- [x] Sẵn sàng để reviewer `25127029-DBDANH` xem xét.
