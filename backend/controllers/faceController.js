const User = require('../models/user');
const faceapi = require('face-api.js');
const { assertUserNotBanned } = require('../utils/banUtils');
const { logAction } = require('../utils/logAction');
const { serializeUser } = require('./userController');
const { createSessionToken } = require('../utils/sessionToken');

const FACE_DESCRIPTOR_LENGTH = 128;
const FACE_MATCH_THRESHOLD = 0.5;

function normalizeDescriptor(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const descriptor = value.map((item) => Number(item));
  if (
    descriptor.length !== FACE_DESCRIPTOR_LENGTH ||
    descriptor.some((item) => !Number.isFinite(item))
  ) {
    return null;
  }

  return descriptor;
}

function euclideanDistance(firstDescriptor, secondDescriptor) {
  return faceapi.euclideanDistance(firstDescriptor, secondDescriptor);
}

async function registerFace(req, res) {
  try {
    const descriptor = normalizeDescriptor(req.body?.descriptor);
    if (!descriptor) {
      return res.status(400).json({ message: 'A valid 128-value face descriptor is required' });
    }

    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $set: { faceDescriptor: descriptor } },
      { runValidators: true },
    );

    return res.status(200).json({
      message: 'Face registered successfully',
      hasFaceDescriptor: true,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to register face' });
  }
}

async function loginWithFace(req, res) {
  try {
    const descriptor = normalizeDescriptor(req.body?.descriptor);
    if (!descriptor) {
      return res.status(400).json({ message: 'A valid 128-value face descriptor is required' });
    }

    const candidates = await User.find({
      faceDescriptor: { $exists: true, $type: 'array', $ne: [] },
    }).select('+faceDescriptor name email role trade job profileImage isPremium subscriptionType isBanned banType banExpiresAt googleAuth patent address companyPhone');

    if (!candidates.length) {
      return res.status(404).json({ message: 'No registered face profiles are available yet' });
    }

    let bestMatch = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    candidates.forEach((candidate) => {
      const savedDescriptor = normalizeDescriptor(candidate.faceDescriptor);
      if (!savedDescriptor) return;

      const distance = euclideanDistance(descriptor, savedDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = candidate;
      }
    });

    if (!bestMatch || bestDistance >= FACE_MATCH_THRESHOLD) {
      return res.status(401).json({ message: 'Face not recognized' });
    }

    const banCheck = await assertUserNotBanned(bestMatch, 'log in');
    if (!banCheck.ok) {
      return res.status(banCheck.status).json({ message: banCheck.message });
    }

    logAction({
      userId: bestMatch._id,
      action: 'login',
      entityType: 'user',
      entityId: bestMatch._id,
      description: `${bestMatch.role} logged in with facial recognition`,
    });

    return res.status(200).json({
      message: 'Face login successful',
      user: {
        ...serializeUser(bestMatch),
        hasFaceDescriptor: true,
      },
      token: createSessionToken(bestMatch),
      match: {
        distance: Number(bestDistance.toFixed(4)),
        threshold: FACE_MATCH_THRESHOLD,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to login with face' });
  }
}

module.exports = {
  FACE_MATCH_THRESHOLD,
  loginWithFace,
  registerFace,
};
