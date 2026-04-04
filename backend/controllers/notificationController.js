const mongoose = require('mongoose');
const Notification = require('../models/notification');
const User = require('../models/user');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

function formatTradeLabel(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function notificationToResponse(notification) {
    return {
        id: String(notification._id),
        userId:
            typeof notification.userId === 'object' && notification.userId !== null
                ? String(notification.userId._id || notification.userId.id)
                : String(notification.userId),
        type: notification.type,
        message: notification.message,
        relatedId: notification.relatedId ? String(notification.relatedId) : null,
        isRead: Boolean(notification.isRead),
        createdAt: notification.createdAt,
    };
}

async function createNotification({ userId, type, message, relatedId = null }) {
    if (!userId || !isValidObjectId(userId)) {
        throw new Error('Valid userId is required to create a notification');
    }

    if (!['new_project', 'application_accepted', 'application_rejected'].includes(String(type || ''))) {
        throw new Error('Invalid notification type');
    }

    if (!message || !String(message).trim()) {
        throw new Error('Notification message is required');
    }

    const payload = {
        userId,
        type,
        message: String(message).trim(),
        isRead: false,
    };

    if (relatedId && isValidObjectId(relatedId)) {
        payload.relatedId = relatedId;
    }

    return Notification.create(payload);
}

async function notifyArtisansForNewProject(project) {
    const trades = Array.from(
        new Set(
            [project?.job, ...(Array.isArray(project?.teamRequirements) ? project.teamRequirements.map((entry) => entry?.job) : [])]
                .map((value) => String(value || '').trim().toLowerCase())
                .filter(Boolean)
        )
    );

    if (!trades.length) {
        return [];
    }

    const tradeLabels = trades.map((trade) => formatTradeLabel(trade));
    const artisans = await User.find({
        role: 'artisan',
        $or: [{ trade: { $in: trades } }, { job: { $in: tradeLabels } }],
    }).select('_id trade job');

    if (!artisans.length) {
        return [];
    }

    const uniqueTrades = tradeLabels.join(', ');
    const message = `New project "${project.projectName}" is available for ${uniqueTrades}.`;

    return Notification.insertMany(
        artisans.map((artisan) => ({
            userId: artisan._id,
            type: 'new_project',
            message,
            relatedId: project._id,
            isRead: false,
        }))
    );
}

async function notifyArtisanAboutApplicationReview({ application, projectName, status }) {
    if (!application?.artisanId || !['accepted', 'rejected'].includes(String(status || '').toLowerCase())) {
        return null;
    }

    const normalizedStatus = String(status).toLowerCase();
    const type = normalizedStatus === 'accepted' ? 'application_accepted' : 'application_rejected';
    const message =
        normalizedStatus === 'accepted'
            ? `Your application for "${projectName}" as ${formatTradeLabel(application.job)} was accepted.`
            : `Your application for "${projectName}" as ${formatTradeLabel(application.job)} was rejected.`;

    return createNotification({
        userId: application.artisanId,
        type,
        message,
        relatedId: application._id,
    });
}

exports.createNotification = createNotification;
exports.notifyArtisansForNewProject = notifyArtisansForNewProject;
exports.notifyArtisanAboutApplicationReview = notifyArtisanAboutApplicationReview;

exports.getUserNotifications = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authenticated user is required' });
        }

        if (req.user.role !== 'artisan') {
            return res.status(403).json({ message: 'Only artisans can access notifications' });
        }

        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            isRead: false,
        });

        return res.status(200).json({
            notifications: notifications.map(notificationToResponse),
            unreadCount,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ message: 'Authenticated user is required' });
        }

        if (req.user.role !== 'artisan') {
            return res.status(403).json({ message: 'Only artisans can update notifications' });
        }

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid notification id' });
        }

        const notification = await Notification.findOne({
            _id: id,
            userId: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (!notification.isRead) {
            notification.isRead = true;
            await notification.save();
        }

        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            isRead: false,
        });

        return res.status(200).json({
            message: 'Notification marked as read',
            notification: notificationToResponse(notification),
            unreadCount,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to update notification' });
    }
};
