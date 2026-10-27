import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bắt buộc xác thực cho mọi route trips (Yêu cầu 1)
router.use(requireAuth);

router.post('/', (req, res) => {
  res.status(201).json({ message: 'Tạo chuyến đi mới (Yêu cầu 2 - 8 tiêu chí TP.HCM)' });
});

router.get('/', (req, res) => {
  res.json({ message: 'Danh sách My Trips của người dùng (Yêu cầu 5)' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Chi tiết chuyến đi kèm timeline và bản đồ' });
});

router.post('/:id/chat', (req, res) => {
  res.json({ message: 'Đàm thoại AI 4 bước, đổi địa điểm và gửi kèm In-chat Map Card' });
});

router.post('/:id/contingency', (req, res) => {
  res.json({ message: 'Kích hoạt phương án dự phòng trời mưa / kẹt xe (Yêu cầu 4)' });
});

router.post('/:id/review', (req, res) => {
  res.json({ message: 'AI chấm điểm và đánh giá chuyên môn lịch trình (Yêu cầu 5)' });
});

export default router;
