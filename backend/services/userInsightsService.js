const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const Log = require('../models/log');
const User = require('../models/user');

const ALLOWED_ACTIONS = [
  'login',
  'project_created',
  'quote_requested',
  'quote_accepted',
  'invoice_created',
  'subscription_payment',
];

const ACTION_TO_METRIC = {
  login: 'loginCount',
  project_created: 'projectsCreated',
  quote_requested: 'quotesRequested',
  quote_accepted: 'quotesAccepted',
  invoice_created: 'invoicesCreated',
  subscription_payment: 'subscriptionPayments',
};

const METRIC_NAMES = [
  'loginCount',
  'projectsCreated',
  'quotesRequested',
  'quotesAccepted',
  'invoicesCreated',
  'subscriptionPayments',
];

const CACHE_TTL_MS = Number(process.env.USER_INSIGHTS_CACHE_TTL_MS || 60000);
const PREDICTOR_TIMEOUT_MS = Number(process.env.USER_INSIGHTS_PREDICTOR_TIMEOUT_MS || 5000);
const cache = new Map();

function getRepoRoot() {
  return path.resolve(__dirname, '..', '..');
}

function getPythonExecutable() {
  if (process.env.USER_INSIGHTS_PYTHON) {
    return process.env.USER_INSIGHTS_PYTHON;
  }

  const repoRoot = getRepoRoot();
  return process.platform === 'win32'
    ? path.join(repoRoot, '.venv', 'Scripts', 'python.exe')
    : path.join(repoRoot, '.venv', 'bin', 'python');
}

function createEmptyMetrics() {
  return METRIC_NAMES.reduce((result, key) => {
    result[key] = 0;
    return result;
  }, {});
}

function normalizeMetrics(metrics = {}) {
  const normalized = createEmptyMetrics();
  METRIC_NAMES.forEach((key) => {
    const value = Number(metrics[key]);
    normalized[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  });
  return normalized;
}

function scoreMetrics(metrics) {
  const engagementScore =
    metrics.loginCount * 0.8 +
    metrics.projectsCreated * 2.4 +
    metrics.quotesRequested * 1.7 +
    metrics.quotesAccepted * 2.7 +
    metrics.invoicesCreated * 2.2 +
    metrics.subscriptionPayments * 3.0;

  const premiumScore =
    metrics.projectsCreated * 2.1 +
    metrics.quotesAccepted * 2.6 +
    metrics.invoicesCreated * 2.5 +
    metrics.subscriptionPayments * 6.0 +
    metrics.loginCount * 0.45;

  return {
    engagementLevel: engagementScore >= 58 ? 'HIGH' : engagementScore >= 24 ? 'MEDIUM' : 'LOW',
    premiumPotential: premiumScore >= 48 ? 'HIGH' : premiumScore >= 20 ? 'MEDIUM' : 'LOW',
  };
}

function fallbackInsight(metrics) {
  const scored = scoreMetrics(metrics);
  const suggestedFeatures = [];

  if (metrics.quotesRequested >= 6 || metrics.quotesAccepted >= 3) {
    suggestedFeatures.push('Calendar conflict management');
  }
  if (metrics.projectsCreated >= 3) {
    suggestedFeatures.push('AI project insights');
  }
  if (metrics.invoicesCreated >= 2) {
    suggestedFeatures.push('Invoice archiving');
  }
  if (metrics.quotesRequested >= 4) {
    suggestedFeatures.push('Marketplace recommendations');
  }
  if (scored.premiumPotential !== 'LOW' || scored.engagementLevel === 'HIGH') {
    suggestedFeatures.push('Premium project management');
  }

  const features = suggestedFeatures.length ? [...new Set(suggestedFeatures)].slice(0, 4) : ['Marketplace recommendations'];
  const recommendationMessage =
    scored.engagementLevel === 'HIGH' && scored.premiumPotential === 'HIGH'
      ? 'Highly active artisan detected. Recommend Premium subscription.'
      : metrics.projectsCreated >= 4 && metrics.invoicesCreated >= 3
        ? 'This artisan frequently creates projects and invoices. Suggest advanced project management tools.'
        : features.includes('AI project insights')
          ? 'Recommend AI analytics dashboard for improved project monitoring.'
          : 'Engagement is still developing. Recommend feature discovery through marketplace recommendations.';

  return {
    metrics,
    ...scored,
    premiumProbability: { LOW: 0.18, MEDIUM: 0.56, HIGH: 0.86 }[scored.premiumPotential],
    suggestedFeatures: features,
    recommendationMessage,
    confidenceScore: 0.64,
    source: 'node-fallback',
  };
}

function getCacheKey(metrics) {
  return METRIC_NAMES.map((key) => `${key}:${metrics[key]}`).join('|');
}

function readCache(metrics) {
  const key = getCacheKey(metrics);
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(metrics, value) {
  cache.set(getCacheKey(metrics), { value, createdAt: Date.now() });
}

function runPredictor(metrics) {
  const cached = readCache(metrics);
  if (cached) {
    return Promise.resolve({ ...cached, cached: true });
  }

  return new Promise((resolve) => {
    const pythonExecutable = getPythonExecutable();
    const scriptPath = path.join(getRepoRoot(), 'ml_user_engagement', 'predictor.py');
    const child = spawn(pythonExecutable, [scriptPath], {
      cwd: getRepoRoot(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        resolve(fallbackInsight(metrics));
      }
    }, PREDICTOR_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(fallbackInsight(metrics));
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (code !== 0) {
        resolve(fallbackInsight(metrics));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const value = {
          ...parsed,
          metrics: normalizeMetrics(parsed.metrics || metrics),
          confidenceScore: Number(parsed.confidenceScore || 0),
        };
        writeCache(metrics, value);
        resolve(value);
      } catch (error) {
        resolve(fallbackInsight(metrics));
      }
    });

    child.stdin.end(JSON.stringify(metrics));
  });
}

async function getMetricsForUser(userId) {
  const objectId = mongoose.Types.ObjectId.isValid(String(userId || ''))
    ? new mongoose.Types.ObjectId(String(userId))
    : userId;
  const rows = await Log.aggregate([
    { $match: { userId: objectId, action: { $in: ALLOWED_ACTIONS } } },
    { $group: { _id: '$action', count: { $sum: 1 } } },
  ]);

  const metrics = createEmptyMetrics();
  rows.forEach((row) => {
    const metricName = ACTION_TO_METRIC[row._id];
    if (metricName) {
      metrics[metricName] = row.count;
    }
  });

  return metrics;
}

async function getTopArtisans(limit = 6) {
  const users = await User.find({ role: 'artisan' })
    .select('name email trade job isPremium subscriptionType')
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(Number(limit) || 6, 12)))
    .lean();

  return users;
}

function summarizeInsight(insight, user = null) {
  return {
    user: user
      ? {
          id: String(user._id || user.id),
          name: user.name || 'Unknown artisan',
          email: user.email || '',
          trade: user.trade || user.job || '',
          isPremium: Boolean(user.isPremium),
          subscriptionType: user.subscriptionType || null,
        }
      : null,
    engagementLevel: insight.engagementLevel,
    premiumPotential: insight.premiumPotential,
    premiumProbability: Number(insight.premiumProbability || 0),
    recommendationMessage: insight.recommendationMessage,
    suggestedFeatures: Array.isArray(insight.suggestedFeatures) ? insight.suggestedFeatures : [],
    confidenceScore: Number(insight.confidenceScore || 0),
    metrics: normalizeMetrics(insight.metrics),
    source: insight.source || 'ml',
    cached: Boolean(insight.cached),
  };
}

async function buildInsightForMetrics(metrics) {
  const normalized = normalizeMetrics(metrics);
  return summarizeInsight(await runPredictor(normalized));
}

async function buildInsightForUser(user) {
  const userId = user._id || user.id;
  const metrics = await getMetricsForUser(userId);
  const insight = await runPredictor(metrics);
  return summarizeInsight(insight, user);
}

async function buildAdminInsights({ userId, metrics, limit } = {}) {
  if (metrics) {
    return buildInsightForMetrics(metrics);
  }

  if (userId) {
    const user = await User.findOne({ _id: userId, role: 'artisan' })
      .select('name email trade job isPremium subscriptionType')
      .lean();
    if (!user) {
      const error = new Error('Artisan user not found');
      error.status = 404;
      throw error;
    }
    return buildInsightForUser(user);
  }

  const users = await getTopArtisans(limit);
  const insights = await Promise.all(users.map((user) => buildInsightForUser(user)));
  return {
    insights,
    summary: {
      total: insights.length,
      highEngagement: insights.filter((item) => item.engagementLevel === 'HIGH').length,
      highPremiumPotential: insights.filter((item) => item.premiumPotential === 'HIGH').length,
      averageConfidence:
        insights.length > 0
          ? Number((insights.reduce((sum, item) => sum + item.confidenceScore, 0) / insights.length).toFixed(4))
          : 0,
    },
  };
}

module.exports = {
  ALLOWED_ACTIONS,
  METRIC_NAMES,
  buildAdminInsights,
  normalizeMetrics,
};
