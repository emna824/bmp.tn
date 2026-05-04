const express = require('express');
const loadRequestUser = require('../middleware/loadRequestUser');
const { generateDocumentation } = require('../controllers/aiController');
const { extractErrorMessage, getProjectInsights } = require('../services/projectInsightsService');

const router = express.Router();

router.post('/generate-doc', loadRequestUser, generateDocumentation);

router.get('/project-insights/:projectId', loadRequestUser, async (req, res) => {
  try {
    console.log('[AI Insights] Request received', {
      projectId: req.params.projectId,
      userId: req.user?._id,
      role: req.user?.role,
    });

    const result = await getProjectInsights(req.params.projectId, req.user);

    console.log('[AI Insights] Generated successfully', {
      projectId: req.params.projectId,
      model: result.insights?.model,
    });

    res.status(200).json(result);
  } catch (error) {
    const status = error.status || error.response?.status || 500;
    const message =
      extractErrorMessage(error.response?.data) ||
      extractErrorMessage(error.message) ||
      'Failed to generate project insights';

    console.error('[AI Insights] Failed to generate insights', {
      projectId: req.params.projectId,
      status,
      message,
    });

    res.status(status).json({ message });
  }
});

module.exports = router;
