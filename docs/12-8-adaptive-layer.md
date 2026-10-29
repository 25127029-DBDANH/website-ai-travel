> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# 🧭 12-8. Tầng Thích ứng Người dùng Cũ & Bỏ Persona v3

## 1. Loại bỏ Personas
- Đã xóa bỏ hoàn toàn định nghĩa file `personas.js` và các tùy chọn phong cách.
- AI phản hồi duy nhất với tư cách là Trợ lý Chuyên gia Du lịch TP.HCM.

## 2. Dịch vụ Người dùng Cũ (Returning Traveler Service)

```javascript
import pool from '../db/connection.js';

/**
 * Kiểm tra lịch sử người dùng cũ để chào mừng và nạp sẵn form
 */
export async function getReturningTravelerData(userId) {
  const tripRes = await pool.query(
    `SELECT title, days, districts, preferences, transport, pace, budget
     FROM trips
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (tripRes.rows.length === 0) {
    return { is_returning: false, prefilled_form: null };
  }

  const lastTrip = tripRes.rows[0];
  return {
    is_returning: true,
    welcome_message: `Chào mừng bạn quay lại! Lần trước bạn đã có chuyến đi rất tuyệt vời tại TP.HCM. Tôi đã điền sẵn các sở thích quen thuộc của bạn vào bảng yêu cầu bên dưới.`,
    prefilled_form: {
      days: lastTrip.days || 2,
      districts: lastTrip.districts || ['Quận 1', 'Quận 3'],
      preferences: lastTrip.preferences || [],
      transport: lastTrip.transport || 'grab',
      pace: lastTrip.pace || 'moderate',
      budget: lastTrip.budget || 3000000
    }
  };
}
```
