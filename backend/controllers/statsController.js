const Invoice = require('../models/invoice');
const Log = require('../models/log');
const Milestone = require('../models/milestone');
const Product = require('../models/product');
const Project = require('../models/project');
const Quote = require('../models/quote');
const User = require('../models/user');

const MONTH_FORMAT = '%Y-%m';

function requireRole(req, res, allowedRoles) {
  if (!req.user) {
    res.status(401).json({ message: 'Authenticated user is required' });
    return false;
  }

  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({ message: `${allowedRoles.join(' or ')} access required` });
    return false;
  }

  return true;
}

function mapStatusCounts(rows, statuses) {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  rows.forEach((row) => {
    counts[row._id] = row.count;
  });

  return statuses.map((status) => ({
    name: status,
    value: counts[status] || 0,
  }));
}

function mapMonthlyRows(rows, valueKey = 'value') {
  return rows.map((row) => ({
    month: row._id,
    [valueKey]: Number(row[valueKey] || row.value || 0),
  }));
}

exports.getArtisanStats = async (req, res) => {
  try {
    if (!requireRole(req, res, ['artisan'])) return;

    const userId = req.user._id;

    const [spendingRows, quoteStatusRows, workloadRows] = await Promise.all([
      Invoice.aggregate([
        { $match: { artisanId: userId } },
        {
          $group: {
            _id: { $dateToString: { format: MONTH_FORMAT, date: '$issuedAt' } },
            total: { $sum: '$totalPrice' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Quote.aggregate([
        { $match: { artisanId: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Milestone.aggregate([
        { $match: { artisanId: userId } },
        { $group: { _id: '$projectId', tasks: { $sum: 1 } } },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'project',
          },
        },
        { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            projectId: '$_id',
            name: { $ifNull: ['$project.projectName', 'Untitled project'] },
            tasks: 1,
          },
        },
        { $sort: { tasks: -1, name: 1 } },
        { $limit: 8 },
      ]),
    ]);

    return res.status(200).json({
      spendingOverTime: mapMonthlyRows(spendingRows, 'total'),
      quotesStatus: mapStatusCounts(quoteStatusRows, ['pending', 'accepted', 'rejected']),
      projectWorkload: workloadRows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load artisan stats' });
  }
};

exports.getExpertStats = async (req, res) => {
  try {
    if (!requireRole(req, res, ['expert'])) return;

    const userId = req.user._id;
    const expertProjects = await Project.find({ expertId: userId })
      .select('_id projectName estimatedBudget totalSpent')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    const projectIds = expertProjects.map((project) => project._id);

    const [quoteStatusRows, timelineRows] = await Promise.all([
      Quote.aggregate([
        { $match: { expertId: userId, status: { $in: ['accepted', 'rejected'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      projectIds.length
        ? Milestone.aggregate([
            { $match: { projectId: { $in: projectIds } } },
            {
              $group: {
                _id: { $dateToString: { format: MONTH_FORMAT, date: '$endDate' } },
                total: { $sum: 1 },
                done: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'done'] }, 1, 0],
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                progress: {
                  $cond: [
                    { $gt: ['$total', 0] },
                    { $round: [{ $multiply: [{ $divide: ['$done', '$total'] }, 100] }, 0] },
                    0,
                  ],
                },
              },
            },
            { $sort: { _id: 1 } },
          ])
        : [],
    ]);

    return res.status(200).json({
      projectPerformance: expertProjects.map((project) => ({
        name: project.projectName || 'Untitled project',
        budget: Number(project.estimatedBudget || 0),
        spent: Number(project.totalSpent || 0),
      })),
      quoteValidationStats: mapStatusCounts(quoteStatusRows, ['accepted', 'rejected']),
      projectTimeline: timelineRows.map((row) => ({
        month: row._id,
        progress: Number(row.progress || 0),
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load expert stats' });
  }
};

exports.getManufacturerStats = async (req, res) => {
  try {
    if (!requireRole(req, res, ['manufacturer'])) return;

    const userId = req.user._id;

    const [salesRows, revenueRows] = await Promise.all([
      Invoice.aggregate([
        { $match: { manufacturerId: userId } },
        {
          $group: {
            _id: '$productId',
            units: { $sum: '$quantity' },
            revenue: { $sum: '$totalPrice' },
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            name: { $ifNull: ['$product.name', 'Unknown product'] },
            units: 1,
            revenue: 1,
          },
        },
        { $sort: { revenue: -1, units: -1 } },
        { $limit: 8 },
      ]),
      Invoice.aggregate([
        { $match: { manufacturerId: userId } },
        {
          $group: {
            _id: { $dateToString: { format: MONTH_FORMAT, date: '$issuedAt' } },
            revenue: { $sum: '$totalPrice' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      productSales: salesRows.map((row) => ({
        name: row.name,
        sales: Number(row.units || 0),
      })),
      revenueOverTime: mapMonthlyRows(revenueRows, 'revenue'),
      topProducts: salesRows.map((row) => ({
        name: row.name,
        revenue: Number(row.revenue || 0),
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load manufacturer stats' });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    if (!requireRole(req, res, ['admin'])) return;

    const [revenueRows, userGrowthRows, activityRows, usageRows] = await Promise.all([
      Invoice.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: MONTH_FORMAT, date: '$issuedAt' } },
            revenue: { $sum: '$totalPrice' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: MONTH_FORMAT, date: '$createdAt' } },
            users: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Log.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return res.status(200).json({
      totalRevenue: mapMonthlyRows(revenueRows, 'revenue'),
      usersGrowth: mapMonthlyRows(userGrowthRows, 'users'),
      activityLogs: activityRows.map((row) => ({
        name: row._id || 'unknown',
        count: row.count,
      })),
      systemUsage: usageRows.map((row) => ({
        name: row._id || 'unknown',
        value: row.count,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load admin stats' });
  }
};
