const mongoose = require('mongoose');
const WorkLog = require('../models/workLog');
const Milestone = require('../models/milestone');
const { syncProjectStatusFromMilestones } = require('../utils/projectExecution');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

function buildDateFilter(dateFrom, dateTo) {
  const filter = {};

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

exports.createWorkLog = async (req, res) => {
  try {
    const { milestoneId, date, description, status } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can create work logs' });
    }

    if (!isValidObjectId(milestoneId)) {
      return res.status(400).json({ message: 'A valid milestoneId is required' });
    }

    if (!date) {
      return res.status(400).json({ message: 'date is required' });
    }

    if (!['done', 'not_done'].includes(String(status || ''))) {
      return res.status(400).json({ message: 'status must be done or not_done' });
    }

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    if (String(milestone.artisanId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only update your own milestone work logs' });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'date must be valid' });
    }

    const workLog = await WorkLog.findOneAndUpdate(
      {
        artisanId: req.user._id,
        milestoneId,
        date: parsedDate,
      },
      {
        artisanId: req.user._id,
        milestoneId,
        date: parsedDate,
        description: String(description || '').trim(),
        status: String(status),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (workLog.status === 'done') {
      milestone.status = 'done';
    } else if (milestone.status === 'pending') {
      milestone.status = 'in_progress';
    }

    await milestone.save();
    await syncProjectStatusFromMilestones(milestone.projectId);

    const populatedWorkLog = await WorkLog.findById(workLog._id).populate({
      path: 'milestoneId',
      populate: { path: 'projectId', select: 'projectName status startDate endDate' },
    });

    return res.status(201).json({
      message: 'Work log saved successfully',
      workLog: populatedWorkLog,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to save work log' });
  }
};

exports.listArtisanWorkLogs = async (req, res) => {
  try {
    const { dateFrom, dateTo, projectId } = req.query;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can access work logs' });
    }

    const filter = { artisanId: req.user._id };
    const dateFilter = buildDateFilter(dateFrom, dateTo);

    if (dateFilter) {
      filter.date = dateFilter;
    }

    const workLogs = await WorkLog.find(filter)
      .populate({
        path: 'milestoneId',
        populate: { path: 'projectId', select: 'projectName status startDate endDate' },
      })
      .sort({ date: -1, createdAt: -1 });

    const filteredWorkLogs = projectId
      ? workLogs.filter(
          (workLog) => String(workLog.milestoneId?.projectId?._id || '') === String(projectId)
        )
      : workLogs;

    return res.status(200).json({ workLogs: filteredWorkLogs });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch work logs' });
  }
};
