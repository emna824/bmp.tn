const express = require('express');
const loadRequestUser = require('../middleware/loadRequestUser');
const messageController = require('../controllers/messageController');
const audioUpload = require('../middleware/audioUpload');

const router = express.Router();

function uploadAudio(req, res, next) {
  audioUpload.single('audio')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message || 'Failed to upload audio' });
    }

    return next();
  });
}

router.get('/:projectId', loadRequestUser, messageController.listProjectMessages);
router.post('/audio', loadRequestUser, uploadAudio, messageController.createAudioMessage);
router.post('/', loadRequestUser, messageController.createMessage);

module.exports = router;
