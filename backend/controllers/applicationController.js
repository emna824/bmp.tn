const mongoose = require('mongoose');
const Application = require('../models/application');
const Offer = require('../models/offer');
const Project = require('../models/project');
const User = require('../models/user');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function ensureUserRole(userId, role) {
  if (!userId || !isValidObjectId(userId)) {
    return { status: 400, message: `A valid ${role}Id is required` };
  }

  const user = await User.findById(userId).select('role');
  if (!user || user.role !== role) {
    return { status: 404, message: `${role[0].toUpperCase()}${role.slice(1)} not found` };
  }

  return { user };
}

exports.applyToOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { artisanId, proposedDailySalary } = req.body;

    if (!isValidObjectId(offerId)) {
      return res.status(400).json({ message: 'Invalid offerId' });
    }

    if (proposedDailySalary === undefined) {
      return res.status(400).json({ message: 'proposedDailySalary is required' });
    }

    const artisanCheck = await ensureUserRole(artisanId, 'artisan');
    if (artisanCheck.message) {
      return res.status(artisanCheck.status).json({ message: artisanCheck.message });
    }

    const salary = Number(proposedDailySalary);
    if (Number.isNaN(salary) || salary < 0) {
      return res.status(400).json({ message: 'proposedDailySalary must be a positive number or zero' });
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.status !== 'open' || offer.availableSlots <= 0) {
      return res.status(400).json({ message: 'Artisan cannot apply to a closed offer' });
    }

    const project = await Project.findById(offer.projectId).select('teamRequirements');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const matchingRequirement = project.teamRequirements.find((entry) => entry.job === offer.job);
    if (!matchingRequirement) {
      return res.status(400).json({ message: 'Offer job does not match project team requirements' });
    }

    if (matchingRequirement.assigned >= matchingRequirement.required) {
      return res.status(400).json({ message: 'This role is already fully assigned' });
    }

    const existingApplication = await Application.findOne({
      artisanId,
      projectId: offer.projectId,
      job: offer.job,
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'Artisan cannot apply twice to the same offer' });
    }

    const application = await Application.create({
      artisanId,
      projectId: offer.projectId,
      job: offer.job,
      proposedDailySalary: salary,
    });

    return res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Artisan cannot apply twice to the same offer' });
    }

    return res.status(500).json({ message: err.message || 'Failed to submit application' });
  }
};

exports.listApplicationsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { expertId } = req.query;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }

    const expertCheck = await ensureUserRole(expertId, 'expert');
    if (expertCheck.message) {
      return res.status(expertCheck.status).json({ message: expertCheck.message });
    }

    const project = await Project.findById(projectId).select('expertId title');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (String(project.expertId) !== String(expertId)) {
      return res.status(403).json({ message: 'Expert can only manage their own projects' });
    }

    const applications = await Application.find({ projectId })
      .populate('artisanId', 'name email job profileImage')
      .sort({ createdAt: -1 });

    return res.status(200).json({ applications });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch applications' });
  }
};

exports.reviewApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { expertId, action } = req.body;

    if (!isValidObjectId(applicationId)) {
      return res.status(400).json({ message: 'Invalid applicationId' });
    }

    if (!['accept', 'reject'].includes(String(action || '').trim().toLowerCase())) {
      return res.status(400).json({ message: 'action must be accept or reject' });
    }

    const expertCheck = await ensureUserRole(expertId, 'expert');
    if (expertCheck.message) {
      return res.status(expertCheck.status).json({ message: expertCheck.message });
    }

    const normalizedAction = String(action).trim().toLowerCase();
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Application has already been reviewed' });
    }

    const project = await Project.findById(application.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (String(project.expertId) !== String(expertId)) {
      return res.status(403).json({ message: 'Expert can only manage their own projects' });
    }

    const requirement = project.teamRequirements.find((entry) => entry.job === application.job);
    if (!requirement) {
      return res.status(400).json({ message: 'Application job does not match project team requirements' });
    }

    const offer = await Offer.findOne({ projectId: project._id, job: application.job });
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (normalizedAction === 'reject') {
      application.status = 'rejected';
      await application.save();
      return res.status(200).json({ message: 'Application rejected', application });
    }

    if (requirement.assigned >= requirement.required) {
      return res.status(400).json({ message: 'Prevented overbooking: required team size already reached' });
    }

    if (offer.status !== 'open' || offer.availableSlots <= 0) {
      return res.status(400).json({ message: 'Offer is closed or already full' });
    }

    requirement.assigned += 1;
    offer.availableSlots = Math.max(0, offer.availableSlots - 1);
    offer.status = offer.availableSlots === 0 ? 'closed' : 'open';
    application.status = 'accepted';

    await Promise.all([project.save(), offer.save(), application.save()]);

    return res.status(200).json({
      message: 'Application accepted',
      application,
      project,
      offer,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to review application' });
  }
};
