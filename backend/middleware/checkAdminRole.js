module.exports = function checkAdminRole(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authenticated user is required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    return next();
};
