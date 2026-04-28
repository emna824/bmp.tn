const express = require('express');
const loadRequestUser = require('../middleware/loadRequestUser');
const messageController = require('../controllers/messageController');

const router = express.Router();

router.get('/:projectId', loadRequestUser, messageController.listProjectMessages);
router.post('/', loadRequestUser, messageController.createMessage);

module.exports = router;
