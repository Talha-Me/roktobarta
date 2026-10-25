const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { requireAuth } = require('../middleware/auth');
const { commentLimiter, csrfProtection } = require('../middleware/security');

// Blog Archive & Filters
router.get('/blog', blogController.getPosts);
router.get('/blog/category/:category', (req, res, next) => {
  req.query.category = req.params.category;
  blogController.getPosts(req, res, next);
});

// Single Article View
router.get('/blog/:slug', csrfProtection, blogController.getPostBySlug);

// Submit Comment on Post
router.post('/blog/:slug/comment', requireAuth, csrfProtection, commentLimiter, blogController.postComment);

module.exports = router;
