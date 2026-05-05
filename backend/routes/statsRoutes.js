const express = require('express');
const statsController = require('../controllers/statsController');
const loadRequestUser = require('../middleware/loadRequestUser');
const { createJsonResponseCache } = require('../middleware/jsonResponseCache');

const router = express.Router();

const cacheStats = createJsonResponseCache({ ttlMs: 25_000, maxEntries: 500 });
const cacheKey = (suffix) => (req) => {
  const id = req.user?._id ? String(req.user._id) : '';
  return id ? `stats:${suffix}:${id}` : '';
};

router.get('/artisan', loadRequestUser, cacheStats(cacheKey('artisan')), statsController.getArtisanStats);
router.get('/expert', loadRequestUser, cacheStats(cacheKey('expert')), statsController.getExpertStats);
router.get('/manufacturer', loadRequestUser, cacheStats(cacheKey('manufacturer')), statsController.getManufacturerStats);
router.get('/admin', loadRequestUser, cacheStats(cacheKey('admin')), statsController.getAdminStats);

module.exports = router;
