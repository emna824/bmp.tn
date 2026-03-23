const express = require('express');
const mongoose = require('mongoose');
const Chantier = require('../models/chantier');

const router = express.Router();

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

router.get('/invitations/:artisanId', async (req, res) => {
    try {
        const { artisanId } = req.params
        if (!artisanId || !isValidObjectId(artisanId)) {
            return res.status(400).json({ message: 'Valid artisanId is required' })
        }

        const chantiers = await Chantier.find({ 'assignments.artisanId': artisanId })
            .populate('projectId', 'name totalBudget')
            .lean()

        const invitations = []

        chantiers.forEach((chantier) => {
            chantier.assignments.forEach((assignment) => {
                if (String(assignment.artisanId) !== String(artisanId)) {
                    return
                }
                invitations.push({
                    chantierId: chantier._id,
                    chantierName: chantier.name,
                    chantierDescription: chantier.description || '',
                    chantierProgress: chantier.progressPercentage ?? 0,
                    projectId: chantier.projectId?._id || null,
                    projectName: chantier.projectId?.name || '',
                    projectBudget: chantier.projectId?.totalBudget || 0,
                    jobTitle: assignment.jobTitle,
                    status: assignment.status,
                    invitedAt: assignment.invitedAt,
                    respondedAt: assignment.respondedAt,
                })
            })
        })

        return res.status(200).json({ invitations })
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
})

router.post('/respond', async (req, res) => {
    try {
        const { artisanId, chantierId, response } = req.body;

        if (!artisanId || !chantierId || !response) {
            return res.status(400).json({ message: 'artisanId, chantierId and response are required' });
        }

        if (!isValidObjectId(artisanId) || !isValidObjectId(chantierId)) {
            return res.status(400).json({ message: 'Invalid artisanId or chantierId' });
        }

        const normalizedResponse = String(response).toLowerCase().trim();
        if (!['accepted', 'declined'].includes(normalizedResponse)) {
            return res.status(400).json({ message: 'Invalid response value' });
        }

        const chantier = await Chantier.findById(chantierId);
        if (!chantier) {
            return res.status(404).json({ message: 'Chantier not found' });
        }

        const assignment = chantier.assignments.find(
            (item) => String(item.artisanId) === String(artisanId)
        );

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found for artisan' });
        }

        assignment.status = normalizedResponse;
        assignment.respondedAt = new Date();
        await chantier.save();

        return res.status(200).json({ message: 'Response recorded', assignment });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
