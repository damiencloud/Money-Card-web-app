import { Router } from 'express';
import { login, refresh, getMe, forgotPassword, resetPassword, changePassword, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/login', authRateLimiter, login);
router.post('/refresh', refresh);
router.get('/me', requireAuth, getMe);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', requireAuth, changePassword);
router.post('/logout', logout);

export default router;
