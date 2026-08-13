import express from 'express';
import { registerUser, confirmEmail, loginUser, generate2FA, verifyAndEnable2FA, forgotPassword, resetPassword } from '../controllers/authController.js';
import { auth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/confirm', confirmEmail);
router.post('/login', loginUser);

// Password Reset Routes (public — no auth required)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// 2FA Routes (requires user to be logged in to set them up)
router.post('/2fa/generate', auth, generate2FA);
router.post('/2fa/turn-on', auth, verifyAndEnable2FA);

export default router;

