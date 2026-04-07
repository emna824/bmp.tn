const express = require('express');
const taskClassifierController = require('../controllers/taskClassifierController');

const router = express.Router();

router.post('/predict', taskClassifierController.predictTaskCategory);

module.exports = router;
