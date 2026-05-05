const { TRADES } = require('../constants/trades');

function formatTradeLabel(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function serializeUser(user, notificationCount = 0) {
    const trade = String(user.trade || user.job || '').trim().toLowerCase();
    const isArtisan = user.role === 'artisan';

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patent: user.patent || null,
        address: user.address || null,
        companyPhone: user.companyPhone || null,
        profileImage: user.profileImage || '',
        trade,
        job: user.job || formatTradeLabel(trade),
        isPremium: isArtisan ? Boolean(user.isPremium) : false,
        subscriptionType: isArtisan ? user.subscriptionType || null : null,
        hasFaceDescriptor: Array.isArray(user.faceDescriptor) && user.faceDescriptor.length === 128,
        notificationCount,
    };
}

exports.serializeUser = serializeUser;

exports.addOrUpdateArtisanTrade = async (req, res) => {
    try {
        const user = req.user;
        const normalizedTrade = String(req.body?.trade || '')
            .trim()
            .toLowerCase();

        if (!user) {
            return res.status(401).json({ message: 'Authenticated user is required' });
        }

        if (user.role !== 'artisan') {
            return res.status(403).json({ message: 'Only artisans can set a trade' });
        }

        if (!normalizedTrade) {
            return res.status(400).json({ message: 'trade is required' });
        }

        if (!TRADES.includes(normalizedTrade)) {
            return res.status(400).json({ message: 'Invalid trade selection' });
        }

        user.trade = normalizedTrade;
        user.job = formatTradeLabel(normalizedTrade);
        await user.save();

        return res.status(200).json({
            message: 'Trade saved successfully',
            user: serializeUser(user),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to save trade' });
    }
};
