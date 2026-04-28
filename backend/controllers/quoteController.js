const mongoose = require('mongoose');
const Project = require('../models/project');
const Product = require('../models/product');
const Quote = require('../models/quote');

const QUOTE_POPULATE = [
  { path: 'projectId', select: 'projectName status startDate endDate totalSpent job' },
  { path: 'productId', select: 'name description price image documentName stock manufacturerId' },
  { path: 'artisanId', select: 'name email job' },
  { path: 'expertId', select: 'name email' },
  { path: 'manufacturerId', select: 'name email' },
];

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function isAssignedArtisan(project, userId) {
  return (project?.assignedArtisans || []).some(
    (assignedArtisanId) => String(assignedArtisanId) === String(userId)
  );
}

function isSoloOwner(project, userId) {
  return project?.type === 'solo' && String(project?.ownerId || '') === String(userId);
}

async function loadAccessibleProject(projectId, user) {
  const project = await Project.findById(projectId).select(
    'projectName expertId ownerId type assignedArtisans status totalSpent'
  );

  if (!project) {
    return { error: { status: 404, message: 'Project not found' } };
  }

  if (user.role === 'expert') {
    if (String(project.expertId) !== String(user._id)) {
      return { error: { status: 403, message: 'You can only access quotes for your own projects' } };
    }
  } else if (user.role === 'artisan') {
    if (!isAssignedArtisan(project, user._id) && !isSoloOwner(project, user._id)) {
      return { error: { status: 403, message: 'You are not assigned to this project' } };
    }
  } else {
    return { error: { status: 403, message: 'Only artisans and experts can access project quotes' } };
  }

  return { project };
}

async function populateQuote(quoteId) {
  return Quote.findById(quoteId).populate(QUOTE_POPULATE);
}

exports.createQuote = async (req, res) => {
  try {
    const { projectId, productId, quantity } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can request quotes' });
    }

    if (!isValidObjectId(projectId) || !isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Valid projectId and productId are required' });
    }

    const parsedQuantity = Number.parseInt(String(quantity), 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({ message: 'quantity must be at least 1' });
    }

    const access = await loadAccessibleProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    if (['finished', 'closed'].includes(String(access.project.status))) {
      return res.status(400).json({ message: 'Quotes cannot be requested for finished or closed projects' });
    }

    const product = await Product.findById(productId).select(
      'name price description image stock manufacturerId'
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.manufacturerId) {
      return res.status(400).json({ message: 'This product has no linked manufacturer' });
    }

    if (Number.isFinite(product.stock) && product.stock > 0 && parsedQuantity > product.stock) {
      return res.status(400).json({ message: 'Requested quantity exceeds available stock' });
    }

    if (Number(product.stock) <= 0) {
      return res.status(400).json({ message: 'This product is currently out of stock' });
    }

    const createdQuote = await Quote.create({
      projectId,
      artisanId: req.user._id,
      expertId: access.project.type === 'solo' ? null : access.project.expertId,
      manufacturerId: product.manufacturerId,
      productId,
      quantity: parsedQuantity,
      unitPrice: Number(product.price),
      totalPrice: Number(product.price) * parsedQuantity,
      status: access.project.type === 'solo' ? 'accepted' : 'pending',
    });

    const quote = await populateQuote(createdQuote._id);

    return res.status(201).json({
      message: 'Quote requested successfully',
      quote,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to request quote' });
  }
};

exports.listProjectQuotes = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const access = await loadAccessibleProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    const filter = { projectId };
    if (req.user.role === 'artisan') {
      filter.artisanId = req.user._id;
    }

    const quotes = await Quote.find(filter)
      .populate(QUOTE_POPULATE)
      .sort({ createdAt: -1 });

    return res.status(200).json({ quotes });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch quotes' });
  }
};

exports.updateQuoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = String(req.body?.status || '').trim();

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid quote id' });
    }

    if (!['accepted', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({ message: 'status must be accepted or rejected' });
    }

    const quote = await Quote.findById(id);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    const access = await loadAccessibleProject(quote.projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    const canReviewQuote =
      req.user.role === 'expert' ||
      (req.user.role === 'artisan' &&
        access.project.type === 'solo' &&
        String(access.project.ownerId || '') === String(req.user._id));

    if (!canReviewQuote) {
      return res.status(403).json({ message: 'Only the project owner can validate quotes' });
    }

    if (quote.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending quotes can be reviewed' });
    }

    quote.status = nextStatus;
    await quote.save();

    const populatedQuote = await populateQuote(quote._id);

    return res.status(200).json({
      message: `Quote ${nextStatus} successfully`,
      quote: populatedQuote,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update quote' });
  }
};
