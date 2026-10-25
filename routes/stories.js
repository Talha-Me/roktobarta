const express = require('express');
const router = express.Router();

const storyController = require('../controllers/storyController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { csrfProtection } = require('../middleware/security');

// Stories list
router.get('/stories', storyController.getStories);

// Submit new story
router.post('/stories', requireAuth, upload.single('image'), csrfProtection, storyController.postSubmitStory);

// Single story details
router.get('/stories/:slug', csrfProtection, storyController.getStoryDetails);

// Like toggle (JSON or form)
router.post('/stories/:id/like', requireAuth, csrfProtection, storyController.postToggleLike);

// Add comment to story
router.post('/stories/:id/comments', requireAuth, csrfProtection, storyController.postAddComment);

module.exports = router;
