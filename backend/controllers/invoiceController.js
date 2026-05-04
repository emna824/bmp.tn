const mongoose = require('mongoose');
const Project = require('../models/project');
const Product = require('../models/product');
const Quote = require('../models/quote');
const Invoice = require('../models/invoice');
const { logAction } = require('../utils/logAction');

const INVOICE_POPULATE = [
  { path: 'projectId', select: 'projectName status startDate endDate totalSpent job' },
  { path: 'quoteId', select: 'status quantity totalPrice unitPrice createdAt' },
  { path: 'productId', select: 'name description price image documentName manufacturerId' },
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
      return { error: { status: 403, message: 'You can only access invoices for your own projects' } };
    }
  } else if (user.role === 'artisan') {
    if (!isAssignedArtisan(project, user._id) && !isSoloOwner(project, user._id)) {
      return { error: { status: 403, message: 'You are not assigned to this project' } };
    }
  } else {
    return { error: { status: 403, message: 'Only artisans and experts can access project invoices' } };
  }

  return { project };
}

function buildIssuedAtFilter(dateFrom, dateTo) {
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

async function populateInvoice(invoiceId) {
  return Invoice.findById(invoiceId).populate(INVOICE_POPULATE);
}

exports.createInvoice = async (req, res) => {
  try {
    const { quoteId } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can confirm purchases' });
    }

    if (!isValidObjectId(quoteId)) {
      return res.status(400).json({ message: 'A valid quoteId is required' });
    }

    const quote = await Quote.findById(quoteId);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    if (String(quote.artisanId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only confirm your own accepted quotes' });
    }

    if (quote.status !== 'accepted') {
      return res.status(400).json({ message: 'Invoices can only be generated from accepted quotes' });
    }

    const access = await loadAccessibleProject(quote.projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    if (['finished', 'closed'].includes(String(access.project.status))) {
      return res.status(400).json({ message: 'Invoices cannot be generated for finished or closed projects' });
    }

    const existingInvoice = await Invoice.findOne({ quoteId: quote._id });
    if (existingInvoice) {
      return res.status(409).json({ message: 'An invoice has already been generated for this quote' });
    }

    const product = await Product.findById(quote.productId).select('price manufacturerId');
    if (!product) {
      return res.status(404).json({ message: 'Linked product not found for this quote' });
    }

    const manufacturerId = quote.manufacturerId || product.manufacturerId;
    const expertId = quote.expertId || access.project.expertId || null;
    const unitPrice = Number(quote.unitPrice || product.price || 0);
    const totalPrice = Number(quote.totalPrice || unitPrice * Number(quote.quantity || 0));

    if (!manufacturerId) {
      return res.status(400).json({ message: 'This quote is missing a linked manufacturer' });
    }

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return res.status(400).json({ message: 'This quote has an invalid total price' });
    }

    let shouldSaveQuote = false;

    if (!quote.manufacturerId && manufacturerId) {
      quote.manufacturerId = manufacturerId;
      shouldSaveQuote = true;
    }

    if (!quote.expertId && expertId) {
      quote.expertId = expertId;
      shouldSaveQuote = true;
    }

    if ((!quote.unitPrice || Number(quote.unitPrice) <= 0) && unitPrice > 0) {
      quote.unitPrice = unitPrice;
      shouldSaveQuote = true;
    }

    if ((!quote.totalPrice || Number(quote.totalPrice) <= 0) && totalPrice > 0) {
      quote.totalPrice = totalPrice;
      shouldSaveQuote = true;
    }

    if (shouldSaveQuote) {
      await quote.save();
    }

    const createdInvoice = await Invoice.create({
      projectId: quote.projectId,
      quoteId: quote._id,
      artisanId: quote.artisanId,
      expertId,
      manufacturerId,
      productId: quote.productId,
      quantity: quote.quantity,
      totalPrice,
      status: 'generated',
      issuedAt: new Date(),
    });

    await Project.findByIdAndUpdate(quote.projectId, {
      $inc: { totalSpent: totalPrice },
    });

    const invoice = await populateInvoice(createdInvoice._id);
    logAction({
      userId: req.user._id,
      action: 'invoice_created',
      entityType: 'invoice',
      entityId: createdInvoice._id,
      description: `Invoice generated for quote ${quote._id}`,
    });

    return res.status(201).json({
      message: 'Invoice generated successfully',
      invoice,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to generate invoice' });
  }
};

exports.listProjectInvoices = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { dateFrom, dateTo, status, sort } = req.query;

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

    if (status) {
      filter.status = String(status);
    }

    const issuedAtFilter = buildIssuedAtFilter(dateFrom, dateTo);
    if (issuedAtFilter) {
      filter.issuedAt = issuedAtFilter;
    }

    const sortDirection = String(sort) === 'oldest' ? 1 : -1;

    const invoices = await Invoice.find(filter)
      .populate(INVOICE_POPULATE)
      .sort({ issuedAt: sortDirection, createdAt: sortDirection });

    return res.status(200).json({ invoices });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch invoices' });
  }
};
