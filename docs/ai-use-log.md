# AI Usage Log — HCMC AI Travel Planner

Tài liệu ghi nhận minh bạch việc sử dụng các công cụ AI hỗ trợ phát triển dự án theo yêu cầu môn học CSC10014 — Tư duy tính toán.

| Ngày | Thành viên | Công cụ | Nhiệm vụ đã hỗ trợ | Phần code/tài liệu được sinh | Nội dung cần con người kiểm tra & xác nhận |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-11-21 | Đàng Minh Hạo (Backend — Routing & Adaptive) | Antigravity | Hoàn thiện toàn bộ Issue #8: Tính cước 3 hãng xe, Động cơ kịch bản thích ứng mưa/kẹt xe, và Xuất lịch iCalendar RFC 5545 | - `server/app/utils/transit_calculator.py`<br>- `server/app/services/contingency_service.py`<br>- `server/app/services/calendar_service.py`<br>- `server/app/schemas/calendar.py`<br>- `server/app/api/v1/endpoints/calendar.py`<br>- `server/tests/test_transit_calculator.py`<br>- `server/tests/test_contingency.py`<br>- `server/tests/test_calendar.py` | 1. Đối chiếu và cập nhật biểu giá cước xe (`FARE_RULES`) với giá thực tế của Grab, Xanh SM, Be tại TP.HCM.<br>2. Kiểm tra tính tương thích khi import file `.ics` tải từ endpoint vào Google Calendar và Apple Calendar thực tế.<br>3. Kiểm tra merge với nhánh auth/trip của nhóm trưởng An Khang. |
