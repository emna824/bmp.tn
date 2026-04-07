const express = require('express');
const workLogController = require('../controllers/workLogController');
const loadRequestUser = require('../middleware/loadRequestUser');

const router = express.Router();

router.post('/', loadRequestUser, workLogController.createWorkLog);
router.get('/artisan', loadRequestUser, workLogController.listArtisanWorkLogs);

module.exports = router;
