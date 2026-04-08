const express = require('express');
const quoteController = require('../controllers/quoteController');
const loadRequestUser = require('../middleware/loadRequestUser');

const router = express.Router();

router.post('/', loadRequestUser, quoteController.createQuote);
router.get('/project/:projectId', loadRequestUser, quoteController.listProjectQuotes);
router.patch('/:id/status', loadRequestUser, quoteController.updateQuoteStatus);

module.exports = router;
