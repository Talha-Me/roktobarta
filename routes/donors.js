const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');

// Find Donors listing & search
router.get('/donors', donorController.getDonors);

module.exports = router;
