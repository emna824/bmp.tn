const mongoose = require('mongoose');
const Offer = require('../models/offer');
const Project = require('../models/project');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.listOffers = async (req, res) => {
  try {
    const { job, projectId, status = 'open' } = req.query;
    const filter = {};

    if (status) {
      filter.status = String(status).trim().toLowerCase();
    }

    if (job) {
      filter.job = String(job).trim().toLowerCase();
    }

    if (projectId) {
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({ message: 'Invalid projectId' });
      }
      filter.projectId = projectId;

      const project = await Project.findById(projectId).select('status');
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (project.status !== 'recruiting') {
        return res.status(200).json({ offers: [] });
      }
    }

    if (filter.status === 'open') {
      filter.availableSlots = { $gt: 0 };
    }

    const offers = await Offer.find(filter)
      .populate('projectId', 'projectName estimatedBudget endDate expertId location category dailySalary status')
      .sort({ createdAt: -1 });

    const visibleOffers = offers.filter((offer) => offer.projectId?.status === 'recruiting');

    return res.status(200).json({ offers: visibleOffers });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch offers' });
  }
};

exports.getOfferById = async (req, res) => {
  try {
    const { offerId } = req.params;

    if (!isValidObjectId(offerId)) {
      return res.status(400).json({ message: 'Invalid offerId' });
    }

    const offer = await Offer.findById(offerId).populate(
      'projectId',
      'projectName estimatedBudget endDate expertId location category dailySalary teamRequirements'
    );
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    return res.status(200).json({ offer });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch offer' });
  }
};
