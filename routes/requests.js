const express = require('express');
const router = express.Router();

const requestController = require('../controllers/requestController');
const { requireAuth } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/security');
const { handleValidation, bloodRequestValidator } = require('../middleware/validators');

// Public requests listing
router.get('/requests', requestController.getRequests);

// Create new blood request (login required)
router.get('/requests/new', requireAuth, csrfProtection, requestController.getNewRequest);
router.post(
  '/requests/new',
  requireAuth,
  csrfProtection,
  bloodRequestValidator,
  handleValidation('/requests/new'),
  requestController.postNewRequest
);

// Single request details
router.get('/requests/:id', csrfProtection, requestController.getRequestDetails);

// Respond to request ("আমি রক্ত দিতে পারি")
router.post('/requests/:id/respond', requireAuth, csrfProtection, requestController.postRespondRequest);

// Update status (mark as fulfilled or closed)
router.post('/requests/:id/status', requireAuth, csrfProtection, requestController.postUpdateRequestStatus);

module.exports = router;
