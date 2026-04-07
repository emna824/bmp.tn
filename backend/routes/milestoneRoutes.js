const express = require('express');
const milestoneController = require('../controllers/milestoneController');
const loadRequestUser = require('../middleware/loadRequestUser');

const router = express.Router();

router.post('/', loadRequestUser, milestoneController.createMilestone);
router.get('/project/:id', loadRequestUser, milestoneController.listProjectMilestones);

module.exports = router;
