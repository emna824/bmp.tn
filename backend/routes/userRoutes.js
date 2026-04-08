const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();
const User = require('../models/user');
const Notification = require('../models/notification');
const { TRADES } = require('../constants/trades');
const loadRequestUser = require('../middleware/loadRequestUser');
const { assertUserNotBanned } = require('../utils/banUtils');
const { addOrUpdateArtisanTrade, serializeUser } = require('../controllers/userController');
const passwordResetStore = new Map();
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

const smtpConfigured =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM;

const mailTransporter = smtpConfigured
    ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
          },
      })
    : null;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

async function unreadCount(userId) {
    try {
        return await Notification.countDocuments({ userId, isRead: false });
    } catch (err) {
        console.error('Failed to count notifications', err);
        return 0;
    }
}

function normalizeTradeValue(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function formatTradeLabel(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

async function sendPasswordResetCodeEmail(email, code) {
    if (!mailTransporter) {
        throw new Error(
            'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in backend/.env'
        );
    }

    await mailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Your password reset code',
        text: `Your password reset code is ${code}. It expires in 10 minutes.`,
    });
}

// Route test GET
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, patent, address, companyPhone } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'name, email, password and role are required' });
        }

        const normalizedRole = String(role).toLowerCase().trim();

        const allowedRoles = ['expert', 'artisan', 'manufacturer'];
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        if (String(password).length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        if (normalizedRole === 'manufacturer' && (!patent || !address || !companyPhone)) {
            return res.status(400).json({
                message: 'patent, address and companyPhone are required for manufacturer',
            });
        }

        const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            name: String(name).trim(),
            email: String(email).toLowerCase().trim(),
            password: hashedPassword,
            role: normalizedRole,
        };

        if (normalizedRole === 'manufacturer') {
            userData.patent = String(patent).trim();
            userData.address = String(address).trim();
            userData.companyPhone = String(companyPhone).trim();
        }

        const newUser = await User.create(userData);

        return res.status(201).json({
            message: 'User registered successfully',
            user: serializeUser(newUser, 0),
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required' });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.googleAuth) {
            return res
                .status(401)
                .json({ message: 'This account uses Google sign-in. Please continue with Google.' });
        }

        const isPasswordValid = await bcrypt.compare(String(password), user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const banCheck = await assertUserNotBanned(user, 'log in');
        if (!banCheck.ok) {
            return res.status(banCheck.status).json({ message: banCheck.message });
        }

        const notifications = await unreadCount(user._id);

        return res.status(200).json({
            message: 'Login successful',
            user: serializeUser(user, notifications),
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.post('/google-login', async (req, res) => {
    try {
        if (!googleClient) {
            return res
                .status(500)
                .json({ message: 'Google login not configured. Set GOOGLE_CLIENT_ID in backend/.env' });
        }

        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: 'idToken is required' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: googleClientId,
        });

        const payload = ticket.getPayload();
        const email = String(payload?.email || '').toLowerCase().trim();

        if (!email || !payload?.email_verified) {
            return res.status(401).json({ message: 'Google account email is not verified' });
        }

        let user = await User.findOne({ email });

        if (!user) {
            // Auto-create artisan accounts on first Google sign-in
            user = await User.create({
                name: String(payload.name || payload.given_name || 'Google User').trim(),
                email,
                role: 'artisan',
                googleAuth: true,
                googleId: String(payload.sub || ''),
                password: '', // not used for Google accounts
            });
        } else if (user.googleAuth) {
            if (user.role !== 'artisan') {
                user.role = 'artisan';
                await user.save();
            }
        } else {
            // Existing password-based account: don't mix auth methods silently
            return res.status(400).json({
                message: 'This email is registered with password login. Please sign in with email/password.',
            });
        }

        const banCheck = await assertUserNotBanned(user, 'log in');
        if (!banCheck.ok) {
            return res.status(banCheck.status).json({ message: banCheck.message });
        }

        const notifications = await unreadCount(user._id);

        return res.status(200).json({
            message: 'Google login successful',
            user: serializeUser(user, notifications),
        });
    } catch (err) {
        console.error('Google login failed', err);
        return res.status(401).json({ message: 'Invalid Google token' });
    }
});

router.get('/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select(
            'name email role patent address companyPhone profileImage job trade isPremium subscriptionType'
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const notifications = await unreadCount(user._id);

        return res.status(200).json({
            user: serializeUser(user, notifications),
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/add-trade', loadRequestUser, addOrUpdateArtisanTrade);

router.put('/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, profileImage, job, trade } = req.body;

        if (
            (!name || !String(name).trim()) &&
            typeof profileImage === 'undefined' &&
            typeof job === 'undefined' &&
            typeof trade === 'undefined'
        ) {
            return res.status(400).json({ message: 'name, job, trade or profileImage is required' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name && String(name).trim()) {
            user.name = String(name).trim();
        }

        if (typeof profileImage !== 'undefined') {
            const normalizedProfileImage = String(profileImage || '').trim();
            if (normalizedProfileImage) {
                const isValidFormat = /^data:image\/(png|jpe?g|webp);base64,/i.test(normalizedProfileImage);
                const MAX_IMAGE_STRING_LENGTH = 3_000_000;

                if (!isValidFormat) {
                    return res.status(400).json({ message: 'Invalid image format' });
                }

                if (normalizedProfileImage.length > MAX_IMAGE_STRING_LENGTH) {
                    return res.status(400).json({ message: 'Image is too large' });
                }
            }

            user.profileImage = normalizedProfileImage;
        }

        const requestedTradeValue = typeof trade !== 'undefined' ? trade : job;
        if (typeof requestedTradeValue !== 'undefined') {
            if (user.role === 'artisan') {
                const normalizedTrade = normalizeTradeValue(requestedTradeValue);
                if (normalizedTrade && !TRADES.includes(normalizedTrade)) {
                    return res.status(400).json({ message: 'Invalid trade selection' });
                }

                user.trade = normalizedTrade;
                user.job = normalizedTrade ? formatTradeLabel(normalizedTrade) : '';
            } else if (typeof job !== 'undefined') {
                user.job = String(job || '').trim();
            }
        }

        await user.save();

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: serializeUser(user),
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'currentPassword and newPassword are required' });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isCurrentPasswordValid = await bcrypt.compare(String(currentPassword), user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: 'Current password is invalid' });
        }

        user.password = await bcrypt.hash(String(newPassword), 10);
        await user.save();

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'email is required' });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(200).json({
                message: 'If an account exists with this email, a reset code has been sent.',
            });
        }

        const generatedCode = generateCode();
        passwordResetStore.set(normalizedEmail, {
            code: generatedCode,
            expiresAt: Date.now() + VERIFICATION_CODE_TTL_MS,
        });

        await sendPasswordResetCodeEmail(normalizedEmail, generatedCode);

        return res.status(200).json({
            message: 'If an account exists with this email, a reset code has been sent.',
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'email, code and newPassword are required' });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const pendingReset = passwordResetStore.get(normalizedEmail);

        if (!pendingReset) {
            return res.status(400).json({
                message: 'No active reset code. Please request a new reset code.',
            });
        }

        if (Date.now() > pendingReset.expiresAt) {
            passwordResetStore.delete(normalizedEmail);
            return res.status(400).json({
                message: 'Reset code expired. Please request a new reset code.',
            });
        }

        if (String(code).trim() !== pendingReset.code) {
            return res.status(401).json({ message: 'Invalid reset code' });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            passwordResetStore.delete(normalizedEmail);
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = await bcrypt.hash(String(newPassword), 10);
        await user.save();
        passwordResetStore.delete(normalizedEmail);

        return res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
