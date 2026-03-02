const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/user');

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
            },
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
