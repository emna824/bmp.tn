const { getTaskSuggestions, localPredictTaskCategory } = require('../utils/taskClassifier');

const REMOTE_CLASSIFIER_URL = (process.env.TASK_CLASSIFIER_API || 'http://127.0.0.1:5001').replace(/\/$/, '');
const REMOTE_TIMEOUT_MS = Number(process.env.TASK_CLASSIFIER_TIMEOUT_MS || 1500);
const REMOTE_FAILURE_COOLDOWN_MS = 30000;

let lastRemoteFailureAt = 0;

async function remotePredictTaskCategory(task) {
  if (!REMOTE_CLASSIFIER_URL) {
    return null;
  }

  if (Date.now() - lastRemoteFailureAt < REMOTE_FAILURE_COOLDOWN_MS) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);

  try {
    const response = await fetch(`${REMOTE_CLASSIFIER_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Remote classifier failed with ${response.status}`);
    }

    const payload = await response.json();
    if (!payload?.category) {
      return null;
    }

    return {
      category: String(payload.category),
      confidence: Number(payload.confidence ?? 0),
      source: 'ml',
      materials: Array.isArray(payload.materials) ? payload.materials : [],
      best_practices: Array.isArray(payload.best_practices) ? payload.best_practices : [],
      safety: Array.isArray(payload.safety) ? payload.safety : [],
    };
  } catch (error) {
    lastRemoteFailureAt = Date.now();
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

exports.predictTaskCategory = async (req, res) => {
  const task = req.body?.task;

  if (typeof task !== 'string' || !task.trim()) {
    return res.status(400).json({ message: 'task is required' });
  }

  const prediction =
    (await remotePredictTaskCategory(task)) ||
    localPredictTaskCategory(task);

  if (!prediction) {
    const suggestions = getTaskSuggestions('', task);
    return res.status(200).json({
      category: null,
      confidence: 0,
      source: 'none',
      materials: suggestions.materials,
      best_practices: suggestions.best_practices,
      safety: suggestions.safety,
    });
  }

  return res.status(200).json(prediction);
};
