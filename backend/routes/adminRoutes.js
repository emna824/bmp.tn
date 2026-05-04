const express = require('express');
const adminLogController = require('../controllers/adminLogController');
const loadRequestUser = require('../middleware/loadRequestUser');
const checkAdminRole = require('../middleware/checkAdminRole');

const router = express.Router();

router.get('/logs', loadRequestUser, checkAdminRole, adminLogController.listLogs);

module.exports = router;
