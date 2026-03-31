const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

router.post('/', requestController.createRequest);
router.patch('/:requestId/status', requestController.updateRequestStatus);

module.exports = router;
