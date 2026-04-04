const express = require('express');
const loadRequestUser = require('../middleware/loadRequestUser');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/', loadRequestUser, notificationController.getUserNotifications);
router.put('/:id/read', loadRequestUser, notificationController.markAsRead);

module.exports = router;
