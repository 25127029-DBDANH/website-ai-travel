import jwt from 'jsonwebtoken';

/**
 * Middleware bắt buộc đăng nhập (Auth Gate - Yêu cầu 1)
 * Mọi request tiện ích bắt buộc phải có Bearer Token.
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
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'default_secret', { algorithms: ['HS256'] });
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
      }
    });
  }
}
