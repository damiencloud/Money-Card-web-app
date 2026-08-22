import { Router } from 'express';
import {
  login,
  refresh,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  logout,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validation/index.js';

const router = Router();

router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), login);
router.post('/refresh', refresh);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, validateRequest({ body: updateProfileSchema }), updateProfile);
router.post('/forgot-password', authRateLimiter, validateRequest({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', validateRequest({ body: resetPasswordSchema }), resetPassword);
router.post('/change-password', requireAuth, validateRequest({ body: changePasswordSchema }), changePassword);
router.post('/logout', logout);

export default router;
