const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { csrfProtection } = require('../middleware/security');
const {
  handleValidation,
  profileValidator,
  changePasswordValidator,
  donationLogValidator
} = require('../middleware/validators');

// Dashboard Home (Overview)
router.get('/dashboard', requireAuth, csrfProtection, userController.getDashboard);

// Profile Update
router.post(
  '/dashboard/profile',
  requireAuth,
  upload.single('avatar'),
  csrfProtection,
  profileValidator,
  handleValidation('/dashboard#profile'),
  userController.postEditProfile
);

// Toggle Availability & Phone Visibility
router.post('/dashboard/toggle-availability', requireAuth, csrfProtection, userController.toggleAvailability);
router.post('/dashboard/toggle-phone-public', requireAuth, csrfProtection, userController.togglePhonePublic);

// Change Password
router.post(
  '/dashboard/change-password',
  requireAuth,
  csrfProtection,
  changePasswordValidator,
  handleValidation('/dashboard#security'),
  userController.postChangePassword
);

// Add Donation Log
router.post(
  '/dashboard/donations',
  requireAuth,
  csrfProtection,
  donationLogValidator,
  handleValidation('/dashboard#history'),
  userController.postAddDonationLog
);

// Notification Read
router.post('/dashboard/notifications/:id/read', requireAuth, csrfProtection, userController.markNotificationRead);

// Delete Account
router.post('/dashboard/delete-account', requireAuth, csrfProtection, userController.deleteAccount);

module.exports = router;
