const express = require('express');
const invoiceController = require('../controllers/invoiceController');
const loadRequestUser = require('../middleware/loadRequestUser');

const router = express.Router();

router.post('/', loadRequestUser, invoiceController.createInvoice);
router.get('/project/:projectId', loadRequestUser, invoiceController.listProjectInvoices);

module.exports = router;
