const mongoose = require('mongoose');
const Offer = require('../models/offer');
const Request = require('../models/request');
const Project = require('../models/project');
const User = require('../models/user');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.createRequest = async (req, res) => {
  try {
    const { artisanId, projectId, job } = req.body;
    if (!artisanId || !projectId || !job) {
      return res.status(400).json({ message: 'artisanId, projectId, job are required' });
    }
    if (!isValidObjectId(artisanId) || !isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }

    const artisan = await User.findById(artisanId).select('role');
    if (!artisan || artisan.role !== 'artisan') {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    const normalizedJob = String(job).toLowerCase().trim();
    const offer = await Offer.findOne({ projectId, job: normalizedJob, status: 'open', availableSlots: { $gt: 0 } });
    if (!offer) {
      return res.status(400).json({ message: 'No open offer for this job' });
    }

    const existing = await Request.findOne({ artisanId, projectId, job: normalizedJob, status: { $in: ['pending', 'accepted'] } });
    if (existing) {
      return res.status(400).json({ message: 'Request already exists' });
    }

    const request = await Request.create({ artisanId, projectId, job: normalizedJob });
    return res.status(201).json({ message: 'Request submitted', request });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { expertId, action } = req.body;

    if (!isValidObjectId(requestId) || !expertId || !isValidObjectId(expertId)) {
      return res.status(400).json({ message: 'Valid requestId and expertId are required' });
    }
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be accept or reject' });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    const project = await Project.findById(request.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (String(project.expertId) !== String(expertId)) {
      return res.status(403).json({ message: 'Only the project expert can update requests' });
    }

    const offer = await Offer.findOne({ projectId: project._id, job: request.job });
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (action === 'reject') {
      request.status = 'rejected';
      await request.save();
      return res.status(200).json({ message: 'Request rejected', request });
    }

    // accept path
    if (offer.availableSlots <= 0 || offer.status !== 'open') {
      return res.status(400).json({ message: 'Slots are full for this offer' });
    }

    // update counts
    const reqEntry = project.teamRequirements.find((t) => t.job === request.job);
    if (!reqEntry) {
      return res.status(400).json({ message: 'Job not part of team requirements' });
    }
    if (reqEntry.assigned >= reqEntry.required) {
      return res.status(400).json({ message: 'Slots already full for this job' });
    }

    reqEntry.assigned += 1;
    offer.availableSlots -= 1;
    if (offer.availableSlots <= 0) {
      offer.status = 'closed';
    }

    request.status = 'accepted';

    await Promise.all([project.save(), offer.save(), request.save()]);

    return res.status(200).json({ message: 'Request accepted', request, project, offer });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
