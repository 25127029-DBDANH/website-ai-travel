import express from 'express';

const router = express.Router();

router.post('/register', (req, res) => {
  res.json({ message: 'Register endpoint - Sẵn sàng triển khai' });
});

router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint - Sẵn sàng triển khai' });
});

router.post('/google', (req, res) => {
  res.json({ message: 'Google OAuth login endpoint' });
});

export default router;
