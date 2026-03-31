const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/expert/:expertId', projectController.listProjects);
router.get('/:projectId/offers', projectController.listProjectOffers);
router.get('/:projectId/applications', projectController.listProjectApplications);

module.exports = router;
