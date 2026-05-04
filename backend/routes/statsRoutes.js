const express = require('express');
const statsController = require('../controllers/statsController');
const loadRequestUser = require('../middleware/loadRequestUser');

const router = express.Router();

router.get('/artisan', loadRequestUser, statsController.getArtisanStats);
router.get('/expert', loadRequestUser, statsController.getExpertStats);
router.get('/manufacturer', loadRequestUser, statsController.getManufacturerStats);
router.get('/admin', loadRequestUser, statsController.getAdminStats);

module.exports = router;
