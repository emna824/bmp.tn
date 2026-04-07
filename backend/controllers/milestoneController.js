const mongoose = require('mongoose');
const Milestone = require('../models/milestone');
const Project = require('../models/project');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.createMilestone = async (req, res) => {
  try {
    const { projectId, artisanId, title, description, startDate, endDate } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (req.user.role !== 'expert') {
      return res.status(403).json({ message: 'Only experts can create milestones' });
    }

    if (!isValidObjectId(projectId) || !isValidObjectId(artisanId)) {
      return res.status(400).json({ message: 'Valid projectId and artisanId are required' });
    }

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: 'title, startDate, and endDate are required' });
    }

    const project = await Project.findById(projectId).select('expertId assignedArtisans startDate endDate');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (String(project.expertId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only manage milestones for your own projects' });
    }

    const isAssigned = (project.assignedArtisans || []).some(
      (assignedArtisanId) => String(assignedArtisanId) === String(artisanId)
    );

    if (!isAssigned) {
      return res.status(400).json({ message: 'Milestones can only be assigned to project artisans' });
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

    const populatedMilestone = await Milestone.findById(milestone._id).populate('artisanId', 'name email job');

    return res.status(201).json({
      message: 'Milestone created successfully',
      milestone: populatedMilestone,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create milestone' });
  }
};

exports.listProjectMilestones = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const project = await Project.findById(id).select('expertId assignedArtisans');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (req.user.role === 'expert') {
      if (String(project.expertId) !== String(req.user._id)) {
        return res.status(403).json({ message: 'You can only view milestones for your own projects' });
      }
    } else if (req.user.role === 'artisan') {
      const isAssigned = (project.assignedArtisans || []).some(
        (assignedArtisanId) => String(assignedArtisanId) === String(req.user._id)
      );
      if (!isAssigned) {
        return res.status(403).json({ message: 'You are not assigned to this project' });
      }
    } else {
      return res.status(403).json({ message: 'Only experts and artisans can access milestones' });
    }

    const filter =
      req.user.role === 'artisan'
        ? { projectId: id, artisanId: req.user._id }
        : { projectId: id };

    const milestones = await Milestone.find(filter)
      .populate('artisanId', 'name email job')
      .sort({ startDate: 1, createdAt: -1 });

    return res.status(200).json({ milestones });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch milestones' });
  }
};
