const axios = require('axios');
const mongoose = require('mongoose');
const Project = require('../models/project');
const Milestone = require('../models/milestone');
const WorkLog = require('../models/workLog');
const Invoice = require('../models/invoice');
const Quote = require('../models/quote');

const DEFAULT_PROJECT_INSIGHTS_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function extractErrorMessage(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(extractErrorMessage).filter(Boolean).join(' | ');
  if (value && typeof value === 'object') {
    return normalizeText(value.message) || normalizeText(value.error) || normalizeText(value.detail) || JSON.stringify(value);
  }
  return '';
}

function extractGeneratedText(payload) {
  if (typeof payload === 'string') return payload.trim();

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => normalizeText(part?.text || part?.content || ''))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return normalizeText(payload?.generated_text) || normalizeText(payload?.text);
}

function parseInsightJson(text) {
  const rawText = normalizeText(text);
  if (!rawText) return null;

  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch?.[1] || rawText.match(/\{[\s\S]*\}/)?.[0] || rawText;

  try {
    const parsed = JSON.parse(jsonText);
    return {
      summary: normalizeText(parsed.summary),
      risk: normalizeText(parsed.risk || parsed.riskExplanation),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(normalizeText).filter(Boolean)
        : normalizeText(parsed.recommendations)
          ? [normalizeText(parsed.recommendations)]
          : [],
      taskInsights: Array.isArray(parsed.taskInsights)
        ? parsed.taskInsights.map(normalizeText).filter(Boolean)
        : normalizeText(parsed.taskInsights)
          ? [normalizeText(parsed.taskInsights)]
          : [],
    };
  } catch {
    return null;
  }
}

function fallbackInsights(projectData) {
  const delayedPhrase = projectData.delayedTasks === 1 ? '1 delayed task' : `${projectData.delayedTasks} delayed tasks`;
  const invoicePhrase =
    projectData.pendingInvoices === 1 ? '1 pending invoice or purchase item' : `${projectData.pendingInvoices} pending invoice or purchase items`;

  const riskLevel = projectData.delayedTasks > 0 || projectData.budgetUsedPercent >= 85
    ? 'Elevated'
    : projectData.progress < 40
      ? 'Watch'
      : 'Stable';

  return {
    summary: `${projectData.projectName} is ${projectData.progress}% complete with ${projectData.completedMilestones}/${projectData.totalMilestones} milestones done and ${projectData.budgetUsedPercent}% of budget used.`,
    risk: `${riskLevel} risk: ${delayedPhrase}, ${invoicePhrase}, and budget usage at ${projectData.budgetUsedPercent}%.`,
    recommendations: [
      projectData.delayedTasks > 0 ? 'Review overdue milestones with assigned artisans and reset near-term dates.' : 'Keep monitoring milestone completion cadence.',
      projectData.budgetUsedPercent >= 85 ? 'Pause nonessential purchases until remaining work is reprioritized.' : 'Keep quote approvals tied to milestone needs.',
      'Refresh invoices and work logs before the next expert review meeting.',
    ],
    taskInsights: projectData.recentLogs.length
      ? projectData.recentLogs.map((log) => `${log.status}: ${log.description || 'Work log update'} (${log.date || 'no date'})`).slice(0, 3)
      : ['No recent work logs were found for this project yet.'],
  };
}

async function loadProjectInsightData(projectId, user) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    const error = new Error('Invalid project id');
    error.status = 400;
    throw error;
  }

  const project = await Project.findById(projectId)
    .populate('assignedArtisans', 'name email job')
    .lean();

  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  if (user.role !== 'expert' || String(project.expertId || '') !== String(user._id)) {
    const error = new Error('Only the owning expert can generate project insights');
    error.status = 403;
    throw error;
  }

  const [milestones, invoices, quotes] = await Promise.all([
    Milestone.find({ projectId })
      .populate('artisanId', 'name email job')
      .sort({ endDate: 1, createdAt: 1 })
      .lean(),
    Invoice.find({ projectId })
      .populate('productId', 'name')
      .sort({ issuedAt: -1, createdAt: -1 })
      .lean(),
    Quote.find({ projectId })
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const milestoneIds = milestones.map((milestone) => milestone._id);
  const logs = milestoneIds.length
    ? await WorkLog.find({ milestoneId: { $in: milestoneIds } })
      .sort({ date: -1, createdAt: -1 })
      .limit(20)
      .lean()
    : [];

  const now = new Date();
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((milestone) => milestone.status === 'done').length;
  const delayedMilestones = milestones.filter((milestone) => {
    const endDate = milestone.endDate ? new Date(milestone.endDate) : null;
    return milestone.status !== 'done' && endDate && endDate < now;
  });
  const estimatedBudget = Number(project.estimatedBudget || project.budget || 0);
  const totalSpent = Number(project.totalSpent || invoices.reduce((sum, invoice) => sum + Number(invoice.totalPrice || 0), 0));
  const acceptedQuoteIdsWithInvoice = new Set(invoices.map((invoice) => String(invoice.quoteId || '')));
  const pendingInvoices = quotes.filter(
    (quote) => quote.status === 'accepted' && !acceptedQuoteIdsWithInvoice.has(String(quote._id)),
  ).length;

  return {
    projectName: project.projectName || 'Untitled project',
    status: project.status || 'unknown',
    category: project.category || '',
    trade: project.job || '',
    location: project.location?.address || '',
    startDate: formatDate(project.startDate),
    endDate: formatDate(project.endDate),
    progress: totalMilestones ? clampPercent((completedMilestones / totalMilestones) * 100) : 0,
    budgetUsedPercent: estimatedBudget > 0 ? clampPercent((totalSpent / estimatedBudget) * 100) : 0,
    estimatedBudget,
    totalSpent,
    totalMilestones,
    completedMilestones,
    delayedTasks: delayedMilestones.length,
    pendingInvoices,
    invoiceCount: invoices.length,
    quoteStatusCounts: quotes.reduce((counts, quote) => {
      counts[quote.status || 'unknown'] = (counts[quote.status || 'unknown'] || 0) + 1;
      return counts;
    }, {}),
    milestones: milestones.slice(0, 12).map((milestone) => ({
      title: milestone.title,
      status: milestone.status,
      artisan: milestone.artisanId?.name || '',
      startDate: formatDate(milestone.startDate),
      endDate: formatDate(milestone.endDate),
    })),
    delayedMilestones: delayedMilestones.slice(0, 8).map((milestone) => ({
      title: milestone.title,
      status: milestone.status,
      artisan: milestone.artisanId?.name || '',
      endDate: formatDate(milestone.endDate),
    })),
    recentLogs: logs.slice(0, 8).map((log) => ({
      date: formatDate(log.date),
      status: log.status,
      description: log.description,
    })),
  };
}

function buildProjectInsightsPrompt(projectData) {
  return `Analyze this construction project for an expert project manager.

Project data:
${JSON.stringify(projectData, null, 2)}

Provide concise, practical insights. Return only valid JSON with this exact shape:
{
  "summary": "2-3 sentence project summary",
  "risk": "clear explanation of schedule, budget, invoice, or task risk",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "taskInsights": ["task insight 1", "task insight 2", "task insight 3"]
}`;
}

async function generateProjectInsights(projectData) {
  const apiKey = normalizeText(process.env.HF_API_KEY);
  if (!apiKey) {
    const error = new Error('HF_API_KEY is not configured on the backend');
    error.status = 500;
    throw error;
  }

  const model = normalizeText(process.env.HF_PROJECT_INSIGHTS_MODEL) ||
    normalizeText(process.env.HF_MODEL) ||
    DEFAULT_PROJECT_INSIGHTS_MODEL;
  const prompt = buildProjectInsightsPrompt(projectData);

  const response = await axios.post(
    'https://router.huggingface.co/v1/chat/completions',
    {
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a construction project analyst. Be concise, practical, and specific. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 700,
      temperature: 0.25,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 90000,
    },
  );

  const generatedText = extractGeneratedText(response.data);
  const parsedInsights = parseInsightJson(generatedText);
  if (parsedInsights?.summary && parsedInsights?.risk) {
    return { ...parsedInsights, rawText: generatedText, model };
  }

  return { ...fallbackInsights(projectData), rawText: generatedText, model };
}

async function getProjectInsights(projectId, user) {
  const projectData = await loadProjectInsightData(projectId, user);
  const insights = await generateProjectInsights(projectData);
  return { projectData, insights };
}

module.exports = {
  buildProjectInsightsPrompt,
  extractErrorMessage,
  fallbackInsights,
  getProjectInsights,
  loadProjectInsightData,
};
