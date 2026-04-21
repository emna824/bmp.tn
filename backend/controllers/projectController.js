const mongoose = require('mongoose');
const Project = require('../models/project');
const Chantier = require('../models/chantier');
const Offer = require('../models/offer');
const Application = require('../models/application');
const User = require('../models/user');
const Milestone = require('../models/milestone');
const { TRADES } = require('../constants/trades');
const { assertUserNotBanned } = require('../utils/banUtils');
const { notifyArtisansForNewProject } = require('./notificationController');
const { startProject, syncProjectStatusFromMilestones } = require('../utils/projectExecution');

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

function resolveProjectOwnerId(project) {
  return String(project?.ownerId || project?.expertId || '').trim();
}

function isSoloOwner(project, user) {
  return (
    project?.type === 'solo' &&
    user?.role === 'artisan' &&
    resolveProjectOwnerId(project) === String(user?._id || '').trim()
  );
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
      description,
    } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (!['expert', 'artisan'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only experts and artisans can create projects' });
    }

    const isSoloProject = req.user.role === 'artisan';

    if (
      !projectName ||
      !location?.address ||
      estimatedBudget === undefined ||
      !category ||
      !startDate ||
      dailySalary === undefined
    ) {
      return res.status(400).json({
        message:
          'projectName, location, estimatedBudget, category, startDate, and dailySalary are required',
      });
    }

    if (isSoloProject && !req.user.isPremium) {
      return res.status(403).json({ message: 'Only premium artisans can create solo projects' });
    }

    let expertId = null;
    if (!isSoloProject) {
      const expertCheck = await ensureExpert(req.user._id);
      if (expertCheck.message) {
        return res.status(expertCheck.status).json({ message: expertCheck.message });
      }

      const banCheck = await assertUserNotBanned(expertCheck.expert, 'create projects');
      if (!banCheck.ok) {
        return res.status(banCheck.status).json({ message: banCheck.message });
      }

      expertId = req.user._id;
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

    const fallbackJob = String(job || req.user.trade || req.user.job || '').trim().toLowerCase();
    const selectedJob = normalizedRequirements[0]?.job || fallbackJob;

    if (!selectedJob || !TRADES.includes(selectedJob)) {
      return res.status(400).json({
        message: isSoloProject
          ? 'A valid artisan trade is required to create a solo project'
          : 'Select at least one trade with a worker count greater than 0',
      });
    }

    const projectRequirements = isSoloProject
      ? [{ job: selectedJob, required: 1, assigned: 1 }]
      : normalizedRequirements.length
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
      ownerId: req.user._id,
      type: isSoloProject ? 'solo' : 'expert',
      assignedArtisans: isSoloProject ? [req.user._id] : [],
      teamRequirements: projectRequirements,
      status: isSoloProject ? 'in_progress' : 'recruiting',
    });

    try {
      const chantier = await Chantier.create({
        projectId: project._id,
        location: project.location.address,
        progress: 0,
      });

      if (isSoloProject) {
        return res.status(201).json({
          message: 'Solo project created successfully',
          project,
          chantier,
          offers: [],
        });
      }

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
    const { expertId } = req.params;
    const filter = expertId && isValidObjectId(expertId) ? { $or: [{ expertId }, { ownerId: expertId }] } : {};
    const projects = await Project.find(filter)
      .populate('assignedArtisans', 'name email job')
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

    const projects = await Project.find({
      $or: [
        { assignedArtisans: req.user._id },
        { type: 'solo', ownerId: req.user._id },
      ],
    })
      .select(
        '_id projectName startDate endDate job status description category dailySalary location teamRequirements totalSpent type ownerId assignedArtisans expertId'
      )
      .sort({ startDate: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({ projects });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch artisan projects' });
  }
};

exports.listProjectOffers = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }

    const project = await Project.findById(projectId).select('_id projectName title expertId status');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const offers = await Offer.find({ projectId }).sort({ createdAt: -1 });
    return res.status(200).json({ project, offers });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch offers' });
  }
};

exports.startProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const project = await Project.findById(id).select('expertId ownerId type status');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const canStartExpertProject =
      req.user.role === 'expert' && String(project.expertId) === String(req.user._id);
    const canStartSoloProject = isSoloOwner(project, req.user);

    if (!canStartExpertProject && !canStartSoloProject) {
      return res.status(403).json({ message: 'You can only start your own projects' });
    }

    const updatedProject = await startProject(id);

    return res.status(200).json({
      message: 'Project started successfully',
      project: updatedProject,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to start project' });
  }
};

exports.updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (!['closed', 'finished'].includes(normalizedStatus)) {
      return res.status(400).json({ message: 'status must be closed or finished' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.ownerId && project.expertId) {
      project.ownerId = project.expertId;
    }

    if (!project.type) {
      project.type = project.expertId ? 'expert' : 'solo';
    }

    const canManageExpertProject =
      req.user.role === 'expert' && String(project.expertId) === String(req.user._id);
    const canManageSoloProject = isSoloOwner(project, req.user);

    if (!canManageExpertProject && !canManageSoloProject) {
      return res.status(403).json({ message: 'You can only update your own projects' });
    }

    if (normalizedStatus === 'finished') {
      const milestones = await Milestone.find({ projectId: id }).select('status');
      const allDone = milestones.length && milestones.every((milestone) => milestone.status === 'done');

      if (!allDone) {
        return res.status(400).json({ message: 'Project can only be finished once all milestones are done' });
      }

      await syncProjectStatusFromMilestones(id);
      project.status = 'finished';
    } else {
      project.status = 'closed';
    }

    await project.save();

    return res.status(200).json({
      message: 'Project status updated successfully',
      project,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update project status' });
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
