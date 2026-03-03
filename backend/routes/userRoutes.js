const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const router = express.Router();
const User = require('../models/user');
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

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
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
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                patent: newUser.patent || null,
                address: newUser.address || null,
                companyPhone: newUser.companyPhone || null,
                profileImage: newUser.profileImage || '',
            },
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

        const isPasswordValid = await bcrypt.compare(String(password), user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        return res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                patent: user.patent || null,
                address: user.address || null,
                companyPhone: user.companyPhone || null,
                profileImage: user.profileImage || '',
            },
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('name email role patent address companyPhone profileImage');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                patent: user.patent || null,
                address: user.address || null,
                companyPhone: user.companyPhone || null,
                profileImage: user.profileImage || '',
            },
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, profileImage } = req.body;

        if ((!name || !String(name).trim()) && typeof profileImage === 'undefined') {
            return res.status(400).json({ message: 'name or profileImage is required' });
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

        await user.save();

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                patent: user.patent || null,
                address: user.address || null,
                companyPhone: user.companyPhone || null,
                profileImage: user.profileImage || '',
            },
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
