> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# 🏗️ 3. Kiến trúc Hệ thống, API Contracts & Cơ sở Dữ liệu v3

## 3.1. Mô hình Danh tính & Bảo mật Mới
- Không còn hỗ trợ chế độ Khách thao tác trên các tiện ích tạo chuyến.
- Mọi request tạo chuyến, xem bản đồ, đồng bộ lịch bắt buộc phải có header:
  `Authorization: Bearer <JWT>`
- Token JWT chứa `sub: user_id` và được FastAPI dependency `get_current_user` (`server/app/core/dependencies.py`) xác thực tính toàn vẹn.

## 3.2. Bảng Danh sách API Bổ sung theo Kiến trúc v2 Hoàn thiện

| Method | Endpoint | Chức năng mới | Input | Output |
|---|---|---|---|---|
| `POST` | `/api/trips` | Tạo chuyến đi với form 8 trường | `{ days, districts, budget, preferences, group_size, transport, pace, notes }` | `{ trip_id, status: 'draft', itinerary: [...] }` |
| `POST` | `/api/trips/:id/swap` | Đổi địa điểm thông minh (Smart Swap) | `{ stop_id, reason?: string }` | `{ alternatives: [...], updated_itinerary }` |
| `POST` | `/api/trips/:id/contingency` | Kích hoạt phương án dự phòng thời tiết/kẹt xe | `{ reason: 'rain' \| 'traffic' \| 'closed' \| 'budget' }` | `{ backup_plan, updated_itinerary, message }` |
| `POST` | `/api/trips/:id/review` | Yêu cầu AI chấm điểm & đánh giá lịch trình | Không | `{ score, strengths, warnings, insider_tips }` |
| `POST` | `/api/trips/:id/calendar` | Đẩy lịch trình lên Google Calendar | `{ start_date }` | `{ success: true, calendar_link, synced_events }` |
| `GET`  | `/api/trips/:id/export-ics` | Xuất file chuẩn lịch quốc tế `.ICS` | Không | File stream `.ics` |
| `GET`  | `/api/me/previous-preferences` | Lấy sở thích cũ để điền sẵn vào form | Không | `{ has_history: true, preferences: {...} }` |
| `PATCH`| `/api/trips/:id/stops/:stopId` | Cập nhật check-in chặng thực tế (`visited`, ảnh, note) | `{ visited: boolean, photo_url?: string }` | `{ stop_id, visited: true, updated_at }` |
| `POST` | `/api/transit/fare-estimate` | Tính cước 3 hãng xe (Grab / Xanh SM / Be) theo tọa độ | `{ origin_coords, dest_coords }` | `{ grab: {...}, xanh_sm: {...}, be: {...} }` |
| `PATCH`| `/api/trips/:id/expenses/:id` | Cập nhật số tiền thực chi (Inline fare editing) | `{ actual_amount: number }` | `{ expense_id, actual_amount, variance }` |
| `GET`  | `/api/trips/:id/summary` | Lấy dữ liệu tổng kết chuyến đi (4 KPI, 3 nhóm tiền, ảnh) | Không | `{ kpis: {...}, breakdown: {...}, gallery: [...] }` |

## 3.3. Cập nhật Lược đồ Cơ sở Dữ liệu (Schema Updates)
- Bảng `trips`:
  - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE` (Bắt buộc có tài khoản).
  - Thêm các cột: `districts JSONB`, `group_size VARCHAR(20)`, `transport VARCHAR(30)`, `pace VARCHAR(20)`, `special_notes TEXT`, `ai_review JSONB`, `google_calendar_synced BOOLEAN DEFAULT FALSE`.
- Bảng `users`:
  - Bỏ trường cấu hình `trợ lý du lịch TP.HCM chuẩn mực` và `tone`.
  - Thêm trường lưu OAuth Refresh Token cho Google Calendar nếu cần: `google_calendar_token TEXT`.
