const mongoose = require('mongoose');
const Project = require('../models/project');
const Chantier = require('../models/chantier');
const Offer = require('../models/offer');
const Application = require('../models/application');
const Milestone = require('../models/milestone');
const User = require('../models/user');
const { TRADES } = require('../constants/trades');
const { assertUserNotBanned } = require('../utils/banUtils');
const { notifyArtisansForNewProject } = require('./notificationController');
const {
  closeProjectWithNotification,
  isProjectTeamComplete,
  processProjectAutoTransitions,
  startProjectWithNotification,
} = require('../utils/projectExecution');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function ensureExpert(expertId) {
  if (!expertId || !isValidObjectId(expertId)) {
    return { status: 400, message: 'A valid expertId is required' };
  }

  const expert = await User.findById(expertId).select('role isBanned banType banExpiresAt');
  if (!expert || expert.role !== 'expert') {
    return { status: 404, message: 'Expert not found' };
  }

  return { expert };
}

async function ensureProjectOwnership(projectId, expertId) {
  if (!projectId || !isValidObjectId(projectId)) {
    return { status: 400, message: 'A valid project id is required' };
  }

  const expertCheck = await ensureExpert(expertId);
  if (expertCheck.message) {
    return expertCheck;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return { status: 404, message: 'Project not found' };
  }

  if (String(project.expertId) !== String(expertId)) {
    return { status: 403, message: 'Expert can only manage their own projects' };
  }

  return { project, expert: expertCheck.expert };
}

exports.createProject = async (req, res) => {
  try {
    const {
      projectName,
      location,
      estimatedBudget,
      category,
      startDate,
      endDate,
      job,
      teamRequirements,
      dailySalary,
      expertId,
      description,
    } = req.body;

    if (
      !projectName ||
      !location?.address ||
      estimatedBudget === undefined ||
      !category ||
      !startDate ||
      dailySalary === undefined ||
      !expertId
    ) {
      return res.status(400).json({
        message:
          'projectName, location, estimatedBudget, category, startDate, dailySalary, and expertId are required',
      });
    }

    const expertCheck = await ensureExpert(expertId);
    if (expertCheck.message) {
      return res.status(expertCheck.status).json({ message: expertCheck.message });
    }

    const banCheck = await assertUserNotBanned(expertCheck.expert, 'create projects');
    if (!banCheck.ok) {
      return res.status(banCheck.status).json({ message: banCheck.message });
    }

    const numericBudget = Number(estimatedBudget);
    if (Number.isNaN(numericBudget) || numericBudget <= 0) {
      return res.status(400).json({ message: 'estimatedBudget must be greater than 0' });
    }

    const numericDailySalary = Number(dailySalary);
    if (Number.isNaN(numericDailySalary) || numericDailySalary <= 0) {
      return res.status(400).json({ message: 'dailySalary must be greater than 0' });
    }

    if (!['construction', 'renovation'].includes(String(category))) {
      return res.status(400).json({ message: 'category must be construction or renovation' });
    }

    const parsedStartDate = new Date(startDate);
    if (Number.isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ message: 'startDate must be valid' });
    }

    let parsedEndDate;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (Number.isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ message: 'endDate must be valid' });
      }
      if (parsedEndDate < parsedStartDate) {
        return res.status(400).json({ message: 'endDate must be after startDate' });
      }
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: 'location latitude and longitude must be valid numbers' });
    }

    const normalizedRequirements = (Array.isArray(teamRequirements) ? teamRequirements : [])
      .map((requirement) => ({
        job: String(requirement?.job || '').trim().toLowerCase(),
        required: Number(requirement?.required || 0),
        assigned: 0,
      }))
      .filter((requirement) => requirement.job && requirement.required > 0);

    const invalidTrade = normalizedRequirements.some((requirement) => !TRADES.includes(requirement.job));
    if (invalidTrade) {
      return res.status(400).json({ message: 'All team requirement jobs must come from the predefined trades list' });
    }

    const fallbackJob = String(job || '').trim().toLowerCase();
    const selectedJob = normalizedRequirements[0]?.job || fallbackJob;

    if (!selectedJob || !TRADES.includes(selectedJob)) {
      return res.status(400).json({ message: 'Select at least one trade with a worker count greater than 0' });
    }

    const projectRequirements = normalizedRequirements.length
      ? normalizedRequirements
      : [{ job: selectedJob, required: 1, assigned: 0 }];

    const project = await Project.create({
      projectName: String(projectName).trim(),
      location: {
        address: String(location.address).trim(),
        latitude,
        longitude,
      },
      estimatedBudget: numericBudget,
      category: String(category),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      job: selectedJob,
      dailySalary: numericDailySalary,
      description: String(description || '').trim(),
      expertId,
      teamRequirements: projectRequirements,
    });

    try {
      const chantier = await Chantier.create({
        projectId: project._id,
        location: project.location.address,
        progress: 0,
      });

      const offers = await Offer.insertMany(
        projectRequirements.map((requirement) => ({
          projectId: project._id,
          job: requirement.job,
          requiredSlots: requirement.required,
          availableSlots: requirement.required,
          status: 'open',
        }))
      );

      try {
        await notifyArtisansForNewProject(project);
      } catch (notificationError) {
        console.error('Failed to notify artisans about new project', notificationError);
      }

      return res.status(201).json({
        message: 'Project created successfully',
        project,
        chantier,
        offers,
      });
    } catch (creationError) {
      await Promise.allSettled([
        Chantier.deleteOne({ projectId: project._id }),
        Offer.deleteMany({ projectId: project._id }),
        Project.deleteOne({ _id: project._id }),
      ]);

      throw creationError;
    }
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to create project' });
  }
};

exports.listProjects = async (req, res) => {
  try {
    await processProjectAutoTransitions();
    const { expertId } = req.params;
    const filter = expertId && isValidObjectId(expertId) ? { expertId } : {};
    const projects = await Project.find(filter)
      .populate('assignedArtisans', 'name email job profileImage')
      .sort({ createdAt: -1 });
    return res.status(200).json({ projects });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch projects' });
  }
};

exports.listArtisanProjects = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated artisan is required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can access assigned projects' });
    }

    await processProjectAutoTransitions();

    const projects = await Project.find({ assignedArtisans: req.user._id })
      .select('_id projectName startDate endDate job status')
      .sort({ startDate: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({ projects });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch artisan projects' });
  }
};

exports.startProject = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated expert is required' });
    }

    if (req.user.role !== 'expert') {
      return res.status(403).json({ message: 'Only experts can start projects' });
    }

    const ownership = await ensureProjectOwnership(req.params.id, req.user._id);
    if (ownership.message) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const { project } = ownership;

    if (project.status !== 'recruiting') {
      return res.status(400).json({ message: 'Only recruiting projects can be started' });
    }

    if (!isProjectTeamComplete(project)) {
      return res.status(400).json({ message: 'Project can only start once the full team is assigned' });
    }

    const transitionResult = await startProjectWithNotification(project);

    return res.status(200).json({
      message: 'Project started successfully',
      project: transitionResult.project || project,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to start project' });
  }
};

exports.updateProjectStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated expert is required' });
    }

    if (req.user.role !== 'expert') {
      return res.status(403).json({ message: 'Only experts can update project status' });
    }

    const { status } = req.body;
    const nextStatus = String(status || '').trim().toLowerCase();

    if (!['finished', 'closed'].includes(nextStatus)) {
      return res.status(400).json({ message: 'status must be finished or closed' });
    }

    const ownership = await ensureProjectOwnership(req.params.id, req.user._id);
    if (ownership.message) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    const { project } = ownership;

    if (nextStatus === 'finished') {
      const milestones = await Milestone.find({ projectId: project._id }).select('status');
      if (!milestones.length || milestones.some((milestone) => milestone.status !== 'done')) {
        return res.status(400).json({ message: 'All milestones must be done before marking the project as finished' });
      }
    }

    if (nextStatus === 'closed') {
      const transitionResult = await closeProjectWithNotification(project, {
        reason: 'The expert closed the project.',
      });

      return res.status(200).json({
        message: `Project status updated to ${nextStatus}`,
        project: transitionResult.project || project,
      });
    } else {
      project.status = nextStatus;
      await project.save();
    }

    return res.status(200).json({
      message: `Project status updated to ${nextStatus}`,
      project,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to update project status' });
  }
};

exports.listProjectOffers = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }

    const project = await Project.findById(projectId).select('_id title expertId');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const offers = await Offer.find({ projectId }).sort({ createdAt: -1 });
    return res.status(200).json({ project, offers });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch offers' });
  }
};

exports.listProjectApplications = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { expertId } = req.query;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }

    const expertCheck = await ensureExpert(expertId);
    if (expertCheck.message) {
      return res.status(expertCheck.status).json({ message: expertCheck.message });
    }

    const project = await Project.findById(projectId).select('expertId title teamRequirements');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (String(project.expertId) !== String(expertId)) {
      return res.status(403).json({ message: 'Expert can only manage their own projects' });
    }

    const applications = await Application.find({ projectId })
      .populate('artisanId', 'name email job profileImage')
      .sort({ createdAt: -1 });

    return res.status(200).json({ project, applications });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch applications' });
  }
};
