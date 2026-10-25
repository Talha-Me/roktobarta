const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/admin');
const { csrfProtection } = require('../middleware/security');
const upload = require('../middleware/upload');

// Protect all admin routes with requireAdmin
router.use(requireAdmin);

// Dashboard
router.get('/', csrfProtection, adminController.getDashboard);

// User & Donor Management
router.get('/users', csrfProtection, adminController.getUsers);
router.post('/users/:id/ban', csrfProtection, adminController.postToggleBanUser);
router.post('/users/:id/role', csrfProtection, adminController.postToggleRoleUser);
router.post('/users/:id/delete', csrfProtection, adminController.postDeleteUser);

// Blood Request Management
router.get('/requests', csrfProtection, adminController.getRequests);
router.post('/requests/:id/status', csrfProtection, adminController.postUpdateRequestStatus);
router.post('/requests/:id/delete', csrfProtection, adminController.postDeleteRequest);

// Story Moderation
router.get('/stories', csrfProtection, adminController.getStories);
router.post('/stories/:id/status', csrfProtection, adminController.postUpdateStoryStatus);
router.post('/stories/:id/delete', csrfProtection, adminController.postDeleteStory);

// Blog & SEO Management
router.get('/posts', csrfProtection, adminController.getPosts);
router.get('/posts/new', csrfProtection, adminController.getNewPost);
router.post('/posts/new', upload.single('coverImage'), csrfProtection, adminController.postCreatePost);
router.get('/posts/:id/edit', csrfProtection, adminController.getEditPost);
router.post('/posts/:id/edit', upload.single('coverImage'), csrfProtection, adminController.postUpdatePost);
router.post('/posts/:id/delete', csrfProtection, adminController.postDeletePost);

// Contacts Inbox
router.get('/contacts', csrfProtection, adminController.getContacts);
router.post('/contacts/:id/status', csrfProtection, adminController.postUpdateContactStatus);
router.post('/contacts/:id/delete', csrfProtection, adminController.postDeleteContact);

// Data Export (CSV)
router.get('/export/donors', adminController.exportDonorsCSV);
router.get('/export/requests', adminController.exportRequestsCSV);

module.exports = router;
