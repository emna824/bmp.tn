const express = require('express');
const loadRequestUser = require('../middleware/loadRequestUser');
const { loginWithFace, registerFace } = require('../controllers/faceController');

const router = express.Router();

router.post('/register', loadRequestUser, registerFace);
router.post('/login', loginWithFace);

module.exports = router;

