const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Location APIs for Autocomplete
router.get('/locations/districts', apiController.getDistricts);
router.get('/locations/upazilas', apiController.getUpazilas);

module.exports = router;
