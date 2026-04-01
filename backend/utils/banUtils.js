function formatBanDate(date) {
    if (!date) {
        return '';
    }

    return new Date(date).toISOString();
}

async function getActiveBanState(user) {
    if (!user || !user.isBanned) {
        return { active: false, user };
    }

    const isTemporaryBan = user.banType === 'temporary';
    const hasExpiry = Boolean(user.banExpiresAt);

    if (isTemporaryBan && hasExpiry && new Date(user.banExpiresAt) <= new Date()) {
        user.isBanned = false;
        user.banType = undefined;
        user.banExpiresAt = null;
        await user.save();

        return { active: false, user, expired: true };
    }

    return {
        active: true,
        user,
        banType: user.banType || 'permanent',
        banExpiresAt: user.banExpiresAt || null,
    };
}

function buildBanMessage(action, state) {
    if (state.banType === 'temporary' && state.banExpiresAt) {
        return `This account is temporarily banned until ${formatBanDate(state.banExpiresAt)} and cannot ${action}.`;
    }

    return `This account is permanently banned and cannot ${action}.`;
}

async function assertUserNotBanned(user, action) {
    const state = await getActiveBanState(user);
    if (!state.active) {
        return { ok: true, user: state.user };
    }

    return {
        ok: false,
        status: 403,
        message: buildBanMessage(action, state),
    };
}

module.exports = {
    getActiveBanState,
    buildBanMessage,
    assertUserNotBanned,
};
