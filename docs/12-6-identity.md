> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

# 🛡️ 12-6. Middleware Xác thực Danh tính (Identity Middleware v3)

```javascript
import jwt from 'jsonwebtoken';

/**
 * Middleware bắt buộc đăng nhập (Auth Gate v3)
 * Mọi yêu cầu tiện ích (trips, chat, calendar, review) đều yêu cầu JWT hợp lệ.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Bạn cần đăng nhập để sử dụng tính năng này.'
      }
    });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'
      }
    });
  }
}
```
