const mongoose = require('mongoose');
const Milestone = require('../models/milestone');
const WorkLog = require('../models/workLog');
const { normalizeDay, syncMilestoneStatusFromLogs } = require('../utils/projectExecution');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

function formatMilestoneTask(milestone, log, date) {
  return {
    milestoneId: milestone._id,
    artisanId: milestone.artisanId,
    projectId: milestone.projectId?._id || milestone.projectId,
    projectName: milestone.projectId?.projectName || 'Project',
    title: milestone.title,
    description: log?.description || milestone.description || '',
    date,
    status: log?.status || 'not_done',
  };
}

exports.createWorkLog = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated artisan is required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can update work logs' });
    }

    const { milestoneId, date, description, status } = req.body;

    if (!milestoneId || !status) {
      return res.status(400).json({ message: 'milestoneId and status are required' });
    }

    if (!['done', 'not_done'].includes(String(status).trim().toLowerCase())) {
      return res.status(400).json({ message: 'status must be done or not_done' });
    }

    if (!isValidObjectId(milestoneId)) {
      return res.status(400).json({ message: 'milestoneId must be valid' });
    }

    const milestone = await Milestone.findById(milestoneId).populate('projectId', 'projectName status');
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    if (String(milestone.artisanId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Artisan can only update their own milestones' });
    }

    const normalizedDate = normalizeDay(date || new Date());
    if (!normalizedDate) {
      return res.status(400).json({ message: 'date must be valid' });
    }

    const milestoneStart = normalizeDay(milestone.startDate);
    const milestoneEnd = normalizeDay(milestone.endDate);
    if (!milestoneStart || !milestoneEnd || normalizedDate < milestoneStart || normalizedDate > milestoneEnd) {
      return res.status(400).json({ message: 'date must fall within the milestone schedule' });
    }

    const normalizedStatus = String(status).trim().toLowerCase();
    const workLog = await WorkLog.findOneAndUpdate(
      {
        artisanId: req.user._id,
        milestoneId,
        date: normalizedDate,
      },
      {
        $set: {
          artisanId: req.user._id,
          milestoneId,
          date: normalizedDate,
          description: String(description || milestone.description || '').trim(),
          status: normalizedStatus,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const refreshedMilestone = await Milestone.findById(milestoneId);
    const progress = await syncMilestoneStatusFromLogs(refreshedMilestone);

    return res.status(201).json({
      message: 'Work log saved successfully',
      workLog,
      milestone: progress?.milestone || refreshedMilestone,
      progressPercent: progress?.progressPercent ?? 0,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'A work log already exists for this milestone and date' });
    }

    return res.status(500).json({ message: error.message || 'Failed to save work log' });
  }
};

exports.listArtisanWorkLogs = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated artisan is required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can access work logs' });
    }

    const selectedDate = normalizeDay(req.query.date || new Date());
    if (!selectedDate) {
      return res.status(400).json({ message: 'date must be valid' });
    }

    const [milestones, logs] = await Promise.all([
      Milestone.find({ artisanId: req.user._id })
        .populate('projectId', 'projectName status startDate endDate')
        .sort({ startDate: 1, createdAt: 1 }),
      WorkLog.find({ artisanId: req.user._id })
        .populate({
          path: 'milestoneId',
          select: 'title description startDate endDate status projectId',
          populate: {
            path: 'projectId',
            select: 'projectName status startDate endDate',
          },
        })
        .sort({ date: -1, createdAt: -1 }),
    ]);

    const dailyMilestones = milestones.filter((milestone) => {
      const start = normalizeDay(milestone.startDate);
      const end = normalizeDay(milestone.endDate);

      return Boolean(start && end && selectedDate >= start && selectedDate <= end);
    });

    const dayLogs = await WorkLog.find({
      artisanId: req.user._id,
      milestoneId: { $in: dailyMilestones.map((milestone) => milestone._id) },
      date: selectedDate,
    }).lean();

    const dayLogMap = dayLogs.reduce((accumulator, log) => {
      accumulator[String(log.milestoneId)] = log;
      return accumulator;
    }, {});

    const tasks = dailyMilestones.map((milestone) =>
      formatMilestoneTask(milestone, dayLogMap[String(milestone._id)], selectedDate)
    );

    return res.status(200).json({
      tasks,
      logs,
      milestones,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch work logs' });
  }
};
