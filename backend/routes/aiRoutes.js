const express = require('express');
const loadRequestUser = require('../middleware/loadRequestUser');
const { generateDocumentation } = require('../controllers/aiController');

const router = express.Router();

router.post('/generate-doc', loadRequestUser, generateDocumentation);

module.exports = router;
