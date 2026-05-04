const mongoose = require('mongoose');
const Log = require('../models/log');

function normalizeText(value, maxLength) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

function logAction({ userId, action, entityType, entityId, description } = {}) {
  if (!userId || !action || !entityType || !isValidObjectId(userId)) {
    return Promise.resolve(null);
  }

  if (mongoose.connection.readyState !== 1) {
    return Promise.resolve(null);
  }

  const payload = {
    userId,
    action: normalizeText(action, 100),
    entityType: normalizeText(entityType, 80).toLowerCase(),
    description: normalizeText(description, 500),
  };

  if (entityId && isValidObjectId(entityId)) {
    payload.entityId = entityId;
  }

  return Log.create(payload).catch((error) => {
    console.error('Failed to write audit log', error);
    return null;
  });
}

module.exports = { logAction };
