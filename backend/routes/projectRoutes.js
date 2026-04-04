const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const loadRequestUser = require('../middleware/loadRequestUser');

router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/artisan', loadRequestUser, projectController.listArtisanProjects);
router.get('/expert/:expertId', projectController.listProjects);
router.get('/:projectId/offers', projectController.listProjectOffers);
router.get('/:projectId/applications', projectController.listProjectApplications);

module.exports = router;
