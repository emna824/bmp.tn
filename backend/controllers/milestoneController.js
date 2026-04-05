const mongoose = require('mongoose');
const Milestone = require('../models/milestone');
const Project = require('../models/project');
const User = require('../models/user');
const WorkLog = require('../models/workLog');
const { countScheduledDays } = require('../utils/projectExecution');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

function formatProgress(milestone, logs) {
  const totalDays = countScheduledDays(milestone.startDate, milestone.endDate);
  const doneDays = new Set(
    logs
      .filter((log) => log.status === 'done')
      .map((log) => new Date(log.date))
      .filter((value) => !Number.isNaN(value.getTime()))
      .map((value) => {
        value.setHours(0, 0, 0, 0);
        return value.toISOString();
      })
  ).size;

  return {
    totalDays,
    doneDays,
    progressPercent: Math.min(100, Math.round((doneDays / totalDays) * 100)),
  };
}

async function buildMilestoneResponse(milestones) {
  const milestoneIds = milestones.map((milestone) => milestone._id);
  const logs = milestoneIds.length
    ? await WorkLog.find({ milestoneId: { $in: milestoneIds } }).sort({ date: 1, createdAt: 1 }).lean()
    : [];

  const logsByMilestone = logs.reduce((accumulator, log) => {
    const key = String(log.milestoneId);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(log);
    return accumulator;
  }, {});

  return milestones.map((milestone) => {
    const currentLogs = logsByMilestone[String(milestone._id)] || [];
    return {
      ...milestone.toObject(),
      ...formatProgress(milestone, currentLogs),
      workLogs: currentLogs,
    };
  });
}

exports.createMilestone = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated expert is required' });
    }

    if (req.user.role !== 'expert') {
      return res.status(403).json({ message: 'Only experts can create milestones' });
    }

    const {
      projectId,
      artisanId,
      title,
      description,
      startDate,
      endDate,
    } = req.body;

    if (!projectId || !artisanId || !title || !startDate || !endDate) {
      return res.status(400).json({
        message: 'projectId, artisanId, title, startDate, and endDate are required',
      });
    }

    if (!isValidObjectId(projectId) || !isValidObjectId(artisanId)) {
      return res.status(400).json({ message: 'projectId and artisanId must be valid ids' });
    }

    const [project, artisan] = await Promise.all([
      Project.findById(projectId),
      User.findById(artisanId).select('name role job profileImage'),
    ]);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (String(project.expertId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Expert can only manage milestones for their own projects' });
    }

    if (!artisan || artisan.role !== 'artisan') {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    if (!project.assignedArtisans.some((value) => String(value) === String(artisanId))) {
      return res.status(400).json({ message: 'Artisan must be assigned to the project before receiving milestones' });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: 'startDate and endDate must be valid dates' });
    }

    if (parsedEndDate < parsedStartDate) {
      return res.status(400).json({ message: 'endDate must be after startDate' });
    }

    const milestone = await Milestone.create({
      projectId,
      artisanId,
      title: String(title).trim(),
      description: String(description || '').trim(),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    await milestone.populate('artisanId', 'name job profileImage');

    return res.status(201).json({
      message: 'Milestone created successfully',
      milestone,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create milestone' });
  }
};

exports.listProjectMilestones = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const project = await Project.findById(id).populate('assignedArtisans', 'name job profileImage');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isOwner = req.user.role === 'expert' && String(project.expertId) === String(req.user._id);
    const isAssignedArtisan =
      req.user.role === 'artisan' &&
      project.assignedArtisans.some((artisan) => String(artisan._id || artisan) === String(req.user._id));

    if (!isOwner && !isAssignedArtisan) {
      return res.status(403).json({ message: 'You do not have access to this project milestones' });
    }

    const filter = isAssignedArtisan ? { projectId: id, artisanId: req.user._id } : { projectId: id };
    const milestones = await Milestone.find(filter)
      .populate('artisanId', 'name job profileImage')
      .sort({ startDate: 1, createdAt: 1 });

    const milestonePayload = await buildMilestoneResponse(milestones);

    return res.status(200).json({
      project,
      milestones: milestonePayload,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch milestones' });
  }
};
