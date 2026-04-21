const mongoose = require('mongoose');
const User = require('../models/user');

function extractRequestUserId(req) {
    return (
        req.headers['x-user-id'] ||
        req.headers['x-admin-id'] ||
        req.body?.reporterId ||
        req.query?.userId ||
        req.query?.adminId ||
        ''
    );
}

module.exports = async function loadRequestUser(req, res, next) {
    try {
        const requestUserId = String(extractRequestUserId(req)).trim();
        if (!requestUserId) {
            return res.status(401).json({ message: 'Authenticated user id is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(requestUserId)) {
            return res.status(400).json({ message: 'Authenticated user id is invalid' });
        }

        const user = await User.findById(requestUserId).select(
            'name email role trade job isPremium subscriptionType isBanned banType banExpiresAt'
        );

        if (!user) {
            return res.status(404).json({ message: 'Authenticated user not found' });
        }

        req.user = user;
        return next();
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to load request user' });
    }
};
