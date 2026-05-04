const mongoose = require('mongoose');
const Log = require('../models/log');
const User = require('../models/user');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildDateFilter(query) {
  const date = normalizeText(query.date);
  if (date) {
    const start = new Date(date);
    if (Number.isNaN(start.getTime())) {
      return null;
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { $gte: start, $lt: end };
  }

  const filter = {};
  const dateFrom = normalizeText(query.dateFrom);
  const dateTo = normalizeText(query.dateTo);

  if (dateFrom) {
    const parsedFrom = new Date(dateFrom);
    if (!Number.isNaN(parsedFrom.getTime())) {
      filter.$gte = parsedFrom;
    }
  }

  if (dateTo) {
    const parsedTo = new Date(dateTo);
    if (!Number.isNaN(parsedTo.getTime())) {
      filter.$lte = parsedTo;
    }
  }

  return Object.keys(filter).length ? filter : null;
}

function mapUser(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name || 'Unknown user',
    email: user.email || '',
    role: user.role || '',
  };
}

function mapLog(log) {
  const user = mapUser(log.userId);

  return {
    id: String(log._id),
    userId: user?.id || String(log.userId || ''),
    user,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId ? String(log.entityId) : '',
    description: log.description || '',
    createdAt: log.createdAt,
  };
}

exports.listLogs = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const filter = {};

    const action = normalizeText(req.query.action);
    if (action) {
      filter.action = action;
    }

    const dateFilter = buildDateFilter(req.query);
    if (dateFilter) {
      filter.createdAt = dateFilter;
    }

    const search = normalizeText(req.query.search || req.query.user);
    if (search) {
      const userFilter = mongoose.Types.ObjectId.isValid(search)
        ? { _id: search }
        : {
            $or: [
              { name: new RegExp(escapeRegExp(search), 'i') },
              { email: new RegExp(escapeRegExp(search), 'i') },
              { role: new RegExp(escapeRegExp(search), 'i') },
            ],
          };

      const matchingUsers = await User.find(userFilter).select('_id').limit(1000).lean();
      const userIds = matchingUsers.map((user) => user._id);

      if (!userIds.length) {
        return res.status(200).json({
          logs: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }

      filter.userId = { $in: userIds };
    }

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Log.countDocuments(filter),
    ]);

    return res.status(200).json({
      logs: logs.map((log) => mapLog(log)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch admin logs' });
  }
};
