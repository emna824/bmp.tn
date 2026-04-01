const express = require('express');
const reportController = require('../controllers/reportController');
const loadRequestUser = require('../middleware/loadRequestUser');
const checkAdminRole = require('../middleware/checkAdminRole');

const router = express.Router();

router.post('/', loadRequestUser, reportController.createReport);
router.get('/admin-actions', loadRequestUser, checkAdminRole, reportController.getAdminActionLogs);
router.get('/', loadRequestUser, checkAdminRole, reportController.getAllReports);
router.get('/:id', loadRequestUser, checkAdminRole, reportController.getReportById);
router.put('/:id/resolve', loadRequestUser, checkAdminRole, reportController.resolveReport);
router.put('/:id/reject', loadRequestUser, checkAdminRole, reportController.rejectReport);

module.exports = router;
