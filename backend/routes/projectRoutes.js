const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const loadRequestUser = require('../middleware/loadRequestUser');

router.post('/', loadRequestUser, projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/artisan', loadRequestUser, projectController.listArtisanProjects);
router.post('/start/:id', loadRequestUser, projectController.startProject);
router.put('/status/:id', loadRequestUser, projectController.updateProjectStatus);
router.get('/expert/:expertId', projectController.listProjects);
router.get('/:projectId/offers', projectController.listProjectOffers);
router.get('/:projectId/applications', projectController.listProjectApplications);

module.exports = router;
