const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

router.get('/project/:projectId', applicationController.listApplicationsByProject);
router.patch('/:applicationId/review', applicationController.reviewApplication);

module.exports = router;
