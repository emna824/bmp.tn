const mongoose = require('mongoose');
const Message = require('../models/message');
const Project = require('../models/project');

const MESSAGE_POPULATE = [
  { path: 'senderId', select: 'name role profileImage' },
  { path: 'receiverId', select: 'name role profileImage' },
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

function listAssignedArtisanIds(project) {
  return Array.from(
    new Set(
      (project?.assignedArtisans || [])
        .map((artisanId) => String(artisanId || '').trim())
        .filter(Boolean)
    )
  );
}

async function loadAccessibleProject(projectId, user) {
  const project = await Project.findById(projectId).select(
    'projectName expertId ownerId type assignedArtisans status'
  );

  if (!project) {
    return { error: { status: 404, message: 'Project not found' } };
  }

  if (user.role === 'expert') {
    if (String(project.expertId || '') !== String(user._id)) {
      return { error: { status: 403, message: 'You can only access chat for your own projects' } };
    }
  } else if (user.role === 'artisan') {
    if (!isAssignedArtisan(project, user._id) && !isSoloOwner(project, user._id)) {
      return { error: { status: 403, message: 'You are not assigned to this project' } };
    }
  } else {
    return { error: { status: 403, message: 'Only artisans and experts can access project chat' } };
  }

  return { project };
}

function buildArtisanMessageFilter(project, userId) {
  const filter = {
    projectId: project._id,
    $or: [
      { senderId: userId },
      { receiverId: userId },
    ],
  };

  if (project?.expertId) {
    filter.$or.push({ senderId: project.expertId, receiverId: null });
  }

  return filter;
}

async function populateMessage(messageId) {
  return Message.findById(messageId).populate(MESSAGE_POPULATE);
}

exports.listProjectMessages = async (req, res) => {
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

    const filter =
      req.user.role === 'expert'
        ? { projectId }
        : buildArtisanMessageFilter(access.project, req.user._id);

    const messages = await Message.find(filter)
      .populate(MESSAGE_POPULATE)
      .sort({ createdAt: 1, _id: 1 });

    return res.status(200).json({ messages });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch project messages' });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const { projectId, receiverId, content } = req.body;
    const trimmedContent = String(content || '').trim();

    if (!req.user) {
      return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'A valid projectId is required' });
    }

    if (!trimmedContent) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const access = await loadAccessibleProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message });
    }

    const assignedArtisanIds = listAssignedArtisanIds(access.project);
    let nextReceiverId = null;

    if (req.user.role === 'artisan') {
      if (!access.project.expertId) {
        return res.status(400).json({ message: 'This project has no expert chat recipient yet' });
      }

      nextReceiverId = access.project.expertId;
    } else if (req.user.role === 'expert') {
      const normalizedReceiverId = String(receiverId || '').trim();

      if (normalizedReceiverId) {
        if (!isValidObjectId(normalizedReceiverId)) {
          return res.status(400).json({ message: 'receiverId must be a valid user id' });
        }

        if (!assignedArtisanIds.includes(normalizedReceiverId)) {
          return res.status(400).json({ message: 'receiverId must belong to an assigned artisan on this project' });
        }

        nextReceiverId = normalizedReceiverId;
      } else if (assignedArtisanIds.length === 1) {
        nextReceiverId = assignedArtisanIds[0];
      } else if (!assignedArtisanIds.length) {
        return res.status(400).json({ message: 'No assigned artisan is available for this project chat yet' });
      }
    } else {
      return res.status(403).json({ message: 'Only artisans and experts can send project messages' });
    }

    const createdMessage = await Message.create({
      projectId,
      senderId: req.user._id,
      receiverId: nextReceiverId || null,
      content: trimmedContent,
    });

    const message = await populateMessage(createdMessage._id);

    return res.status(201).json({
      message: 'Message sent successfully',
      chatMessage: message,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to send project message' });
  }
};
