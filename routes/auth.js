const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { requireGuest } = require('../middleware/auth');
const { authLimiter, csrfProtection } = require('../middleware/security');
const {
  handleValidation,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../middleware/validators');

// Registration
router.get('/register', requireGuest, csrfProtection, authController.getRegister);
router.post(
  '/register',
  requireGuest,
  authLimiter,
  csrfProtection,
  registerValidator,
  handleValidation('/register'),
  authController.postRegister
);

// Login
router.get('/login', requireGuest, csrfProtection, authController.getLogin);
router.post(
  '/login',
  requireGuest,
  authLimiter,
  csrfProtection,
  loginValidator,
  handleValidation('/login'),
  authController.postLogin
);

// Logout
router.get('/logout', authController.logout);

// Forgot Password
router.get('/forgot-password', requireGuest, csrfProtection, authController.getForgotPassword);
router.post(
  '/forgot-password',
  requireGuest,
  authLimiter,
  csrfProtection,
  forgotPasswordValidator,
  handleValidation('/forgot-password'),
  authController.postForgotPassword
);

// Reset Password (supports both 6-digit OTP code and direct token link)
router.get('/reset-password', requireGuest, csrfProtection, authController.getResetPassword);
router.post(
  '/reset-password',
  requireGuest,
  authLimiter,
  csrfProtection,
  authController.postResetPassword
);
router.get('/reset-password/:token', requireGuest, csrfProtection, authController.getResetPassword);
router.post(
  '/reset-password/:token',
  requireGuest,
  authLimiter,
  csrfProtection,
  authController.postResetPassword
);

// Email Verification
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
