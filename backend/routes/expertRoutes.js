const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/user');
const Project = require('../models/project');
const Chantier = require('../models/chantier');
const Journal = require('../models/journal');

const router = express.Router();
const DEFAULT_JOB_TITLE = 'Worker';

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

async function assertExpert(expertId) {
    if (!isValidObjectId(expertId)) {
        return { error: 'Invalid expertId', status: 400 };
    }

    const expert = await User.findById(expertId).select('role');
    if (!expert || expert.role !== 'expert') {
        return { error: 'Expert not found', status: 404 };
    }

    return { expert };
}

async function ensureArtisansExist(ids) {
    if (!ids.length) {
        return true;
    }

    const count = await User.countDocuments({
        _id: { $in: ids },
        role: 'artisan',
    });
    return count === ids.length;
}

function normalizeAssignments(payload, fallbackIds = [], existingAssignments = []) {
    const entries = [];
    const seen = new Set();
    const existingMap = new Map(
        (existingAssignments || []).map((assignment) => [String(assignment.artisanId), assignment])
    );
    const now = new Date();

    if (Array.isArray(payload)) {
        payload.forEach((assignment) => {
            entries.push(assignment);
        });
    }

    fallbackIds.forEach((artisanId) => {
        entries.push({ artisanId, jobTitle: DEFAULT_JOB_TITLE });
    });

    const normalized = [];
    entries.forEach((entry) => {
        const candidateId = entry?.artisanId ? String(entry.artisanId).trim() : '';
        if (!candidateId || !isValidObjectId(candidateId) || seen.has(candidateId)) {
            return;
        }

        seen.add(candidateId);
        const jobTitle = String(entry?.jobTitle || DEFAULT_JOB_TITLE).trim() || DEFAULT_JOB_TITLE;
        const previous = existingMap.get(candidateId);
        const alreadyAccepted =
            previous?.status === 'accepted' && previous?.jobTitle && previous.jobTitle === jobTitle;

        normalized.push({
            artisanId: candidateId,
            jobTitle,
            status: alreadyAccepted ? 'accepted' : 'pending',
            invitedAt: previous?.invitedAt || now,
            respondedAt: alreadyAccepted ? previous?.respondedAt : undefined,
        });
    });

    return normalized;
}

router.get('/artisans', async (req, res) => {
    try {
        const artisans = await User.find({ role: 'artisan' }).select('name email role profileImage');
        return res.status(200).json({ artisans });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.post('/projects', async (req, res) => {
    try {
        const { expertId, name, description, totalBudget } = req.body;

        if (!expertId || !name || totalBudget === undefined) {
            return res.status(400).json({ message: 'expertId, name and totalBudget are required' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const numericBudget = Number(totalBudget);
        if (Number.isNaN(numericBudget) || numericBudget < 0) {
            return res.status(400).json({ message: 'totalBudget must be a positive number or zero' });
        }

        const createdProject = await Project.create({
            expertId,
            name: String(name).trim(),
            description: String(description || '').trim(),
            totalBudget: numericBudget,
        });

        return res.status(201).json({ message: 'Project created successfully', project: createdProject });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { expertId, name, description, totalBudget } = req.body;

        if (!expertId || !isValidObjectId(projectId)) {
            return res.status(400).json({ message: 'expertId and valid projectId are required' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (String(project.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This project does not belong to the expert' });
        }

        if (typeof name !== 'undefined') {
            if (!String(name).trim()) {
                return res.status(400).json({ message: 'name cannot be empty' });
            }
            project.name = String(name).trim();
        }

        if (typeof description !== 'undefined') {
            project.description = String(description || '').trim();
        }

        if (typeof totalBudget !== 'undefined') {
            const numericBudget = Number(totalBudget);
            if (Number.isNaN(numericBudget) || numericBudget < 0) {
                return res.status(400).json({ message: 'totalBudget must be a positive number or zero' });
            }
            project.totalBudget = numericBudget;
        }

        await project.save();
        return res.status(200).json({ message: 'Project updated successfully', project });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.delete('/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { expertId } = req.query;

        if (!expertId || !isValidObjectId(projectId)) {
            return res.status(400).json({ message: 'expertId and valid projectId are required' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (String(project.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This project does not belong to the expert' });
        }

        const chantiers = await Chantier.find({ projectId }).select('_id').lean();
        const chantierIds = chantiers.map((chantier) => chantier._id);

        await Journal.deleteMany({
            $or: [{ projectId }, { chantierId: { $in: chantierIds } }],
        });
        await Chantier.deleteMany({ projectId });
        await Project.findByIdAndDelete(projectId);

        return res.status(200).json({ message: 'Project deleted successfully' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.post('/projects/:projectId/chantiers', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { expertId, name, description, progressPercentage, allocatedBudget, spentBudget } = req.body;
        const assignmentsPayload = req.body.assignments;
        const fallbackArtisanIds = req.body.artisanIds;

        if (!expertId || !name) {
            return res.status(400).json({ message: 'expertId and name are required' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        if (!isValidObjectId(projectId)) {
            return res.status(400).json({ message: 'Invalid projectId' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (String(project.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This project does not belong to the expert' });
        }

        const numericProgress = Number(progressPercentage ?? 0);
        const numericAllocatedBudget = Number(allocatedBudget ?? 0);
        const numericSpentBudget = Number(spentBudget ?? 0);

        if (Number.isNaN(numericProgress) || numericProgress < 0 || numericProgress > 100) {
            return res.status(400).json({ message: 'progressPercentage must be between 0 and 100' });
        }

        if (Number.isNaN(numericAllocatedBudget) || numericAllocatedBudget < 0) {
            return res.status(400).json({ message: 'allocatedBudget must be a positive number or zero' });
        }

        if (Number.isNaN(numericSpentBudget) || numericSpentBudget < 0) {
            return res.status(400).json({ message: 'spentBudget must be a positive number or zero' });
        }

        const assignments = normalizeAssignments(assignmentsPayload, fallbackArtisanIds);
        const artisanIdsToCheck = assignments.map((assignment) => assignment.artisanId);
        if (!(await ensureArtisansExist(artisanIdsToCheck))) {
            return res.status(400).json({ message: 'One or more artisanIds are invalid' });
        }

        const chantier = await Chantier.create({
            projectId,
            name: String(name).trim(),
            description: String(description || '').trim(),
            progressPercentage: numericProgress,
            allocatedBudget: numericAllocatedBudget,
            spentBudget: numericSpentBudget,
            assignments,
        });

        return res.status(201).json({ message: 'Chantier created successfully', chantier });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/chantiers/:chantierId', async (req, res) => {
    try {
        const { chantierId } = req.params;
        const { expertId, name, description, progressPercentage, allocatedBudget, spentBudget } = req.body;
        const assignmentsPayload = req.body.assignments;
        const fallbackArtisanIds = req.body.artisanIds;

        if (!expertId || !isValidObjectId(chantierId)) {
            return res.status(400).json({ message: 'expertId and valid chantierId are required' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const chantier = await Chantier.findById(chantierId);
        if (!chantier) {
            return res.status(404).json({ message: 'Chantier not found' });
        }

        const project = await Project.findById(chantier.projectId);
        if (!project || String(project.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This chantier does not belong to the expert' });
        }

        if (typeof name !== 'undefined') {
            if (!String(name).trim()) {
                return res.status(400).json({ message: 'name cannot be empty' });
            }
            chantier.name = String(name).trim();
        }

        if (typeof description !== 'undefined') {
            chantier.description = String(description || '').trim();
        }

        if (typeof progressPercentage !== 'undefined') {
            const numericProgress = Number(progressPercentage);
            if (Number.isNaN(numericProgress) || numericProgress < 0 || numericProgress > 100) {
                return res.status(400).json({ message: 'progressPercentage must be between 0 and 100' });
            }
            chantier.progressPercentage = numericProgress;
        }

        if (typeof allocatedBudget !== 'undefined') {
            const numericAllocatedBudget = Number(allocatedBudget);
            if (Number.isNaN(numericAllocatedBudget) || numericAllocatedBudget < 0) {
                return res.status(400).json({ message: 'allocatedBudget must be a positive number or zero' });
            }
            chantier.allocatedBudget = numericAllocatedBudget;
        }

        if (typeof spentBudget !== 'undefined') {
            const numericSpentBudget = Number(spentBudget);
            if (Number.isNaN(numericSpentBudget) || numericSpentBudget < 0) {
                return res.status(400).json({ message: 'spentBudget must be a positive number or zero' });
            }
            chantier.spentBudget = numericSpentBudget;
        }

        if (typeof assignmentsPayload !== 'undefined' || Array.isArray(fallbackArtisanIds)) {
            const assignments = normalizeAssignments(assignmentsPayload, fallbackArtisanIds, chantier.assignments || []);
            const artisanIdsToCheck = assignments.map((assignment) => assignment.artisanId);
            if (!(await ensureArtisansExist(artisanIdsToCheck))) {
                return res.status(400).json({ message: 'One or more artisanIds are invalid' });
            }
            chantier.assignments = assignments;
        }

        await chantier.save();
        return res.status(200).json({ message: 'Chantier updated successfully', chantier });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.delete('/chantiers/:chantierId', async (req, res) => {
    try {
        const { chantierId } = req.params;
        const { expertId } = req.query;

        if (!expertId || !isValidObjectId(chantierId)) {
            return res.status(400).json({ message: 'expertId and valid chantierId are required' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const chantier = await Chantier.findById(chantierId);
        if (!chantier) {
            return res.status(404).json({ message: 'Chantier not found' });
        }

        const project = await Project.findById(chantier.projectId);
        if (!project || String(project.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This chantier does not belong to the expert' });
        }

        await Journal.deleteMany({ chantierId });
        await Chantier.findByIdAndDelete(chantierId);

        return res.status(200).json({ message: 'Chantier deleted successfully' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/chantiers/:chantierId/artisans', async (req, res) => {
    try {
        const { chantierId } = req.params;
        const { expertId } = req.body;
        const assignmentsPayload = req.body.assignments;
        const fallbackArtisanIds = req.body.artisanIds;

        if (!expertId) {
            return res.status(400).json({ message: 'expertId is required' });
        }

        if (!isValidObjectId(chantierId)) {
            return res.status(400).json({ message: 'Invalid chantierId' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const chantier = await Chantier.findById(chantierId);
        if (!chantier) {
            return res.status(404).json({ message: 'Chantier not found' });
        }

        const project = await Project.findById(chantier.projectId);
        if (!project || String(project.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This chantier does not belong to the expert' });
        }

        const assignments = normalizeAssignments(assignmentsPayload, fallbackArtisanIds, chantier.assignments || []);
        const artisanIdsToCheck = assignments.map((assignment) => assignment.artisanId);
        if (!(await ensureArtisansExist(artisanIdsToCheck))) {
            return res.status(400).json({ message: 'One or more artisanIds are invalid' });
        }

        chantier.assignments = assignments;
        await chantier.save();

        return res.status(200).json({ message: 'Artisans assigned successfully', chantier });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.post('/journals', async (req, res) => {
    try {
        const { expertId, projectId, chantierId, activityDate, activities, artisanRecipientIds } = req.body;

        if (!expertId || !projectId || !chantierId || !activityDate || !Array.isArray(activities)) {
            return res.status(400).json({
                message: 'expertId, projectId, chantierId, activityDate and activities are required',
            });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        if (!isValidObjectId(projectId) || !isValidObjectId(chantierId)) {
            return res.status(400).json({ message: 'Invalid projectId or chantierId' });
        }

        const project = await Project.findById(projectId);
        const chantier = await Chantier.findById(chantierId);

        if (!project || !chantier || String(chantier.projectId) !== String(project._id)) {
            return res.status(404).json({ message: 'Project or chantier not found' });
        }

        if (String(project.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This project does not belong to the expert' });
        }

        const normalizedActivities = activities.map((activity) => String(activity || '').trim()).filter(Boolean);
        if (!normalizedActivities.length) {
            return res.status(400).json({ message: 'At least one activity is required' });
        }

        const parsedActivityDate = new Date(activityDate);
        if (Number.isNaN(parsedActivityDate.getTime())) {
            return res.status(400).json({ message: 'Invalid activityDate' });
        }

        const recipients = Array.isArray(artisanRecipientIds) ? artisanRecipientIds : [];
        const validRecipientIds = recipients.filter((id) => isValidObjectId(id));
        if (validRecipientIds.length !== recipients.length) {
            return res.status(400).json({ message: 'One or more artisanRecipientIds are invalid' });
        }

        if (validRecipientIds.length) {
            const artisansCount = await User.countDocuments({
                _id: { $in: validRecipientIds },
                role: 'artisan',
            });

            if (artisansCount !== validRecipientIds.length) {
                return res.status(400).json({ message: 'One or more artisanRecipientIds are invalid' });
            }
        }

        const journal = await Journal.create({
            expertId,
            projectId,
            chantierId,
            activityDate: parsedActivityDate,
            activities: normalizedActivities,
            artisanRecipientIds: validRecipientIds,
        });

        return res.status(201).json({ message: 'Journal sent successfully', journal });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/journals/:journalId', async (req, res) => {
    try {
        const { journalId } = req.params;
        const { expertId, activityDate, activities, artisanRecipientIds } = req.body;

        if (!expertId || !isValidObjectId(journalId)) {
            return res.status(400).json({ message: 'expertId and valid journalId are required' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const journal = await Journal.findById(journalId);
        if (!journal) {
            return res.status(404).json({ message: 'Journal not found' });
        }

        if (String(journal.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This journal does not belong to the expert' });
        }

        if (typeof activityDate !== 'undefined') {
            const parsedActivityDate = new Date(activityDate);
            if (Number.isNaN(parsedActivityDate.getTime())) {
                return res.status(400).json({ message: 'Invalid activityDate' });
            }
            journal.activityDate = parsedActivityDate;
        }

        if (typeof activities !== 'undefined') {
            if (!Array.isArray(activities)) {
                return res.status(400).json({ message: 'activities must be an array' });
            }
            const normalizedActivities = activities.map((activity) => String(activity || '').trim()).filter(Boolean);
            if (!normalizedActivities.length) {
                return res.status(400).json({ message: 'At least one activity is required' });
            }
            journal.activities = normalizedActivities;
        }

        if (typeof artisanRecipientIds !== 'undefined') {
            if (!Array.isArray(artisanRecipientIds)) {
                return res.status(400).json({ message: 'artisanRecipientIds must be an array' });
            }

            const validRecipientIds = artisanRecipientIds.filter((id) => isValidObjectId(id));
            if (validRecipientIds.length !== artisanRecipientIds.length) {
                return res.status(400).json({ message: 'One or more artisanRecipientIds are invalid' });
            }

            if (validRecipientIds.length) {
                const artisansCount = await User.countDocuments({
                    _id: { $in: validRecipientIds },
                    role: 'artisan',
                });
                if (artisansCount !== validRecipientIds.length) {
                    return res.status(400).json({ message: 'One or more artisanRecipientIds are invalid' });
                }
            }

            journal.artisanRecipientIds = validRecipientIds;
        }

        await journal.save();
        return res.status(200).json({ message: 'Journal updated successfully', journal });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.delete('/journals/:journalId', async (req, res) => {
    try {
        const { journalId } = req.params;
        const { expertId } = req.query;

        if (!expertId || !isValidObjectId(journalId)) {
            return res.status(400).json({ message: 'expertId and valid journalId are required' });
        }

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const journal = await Journal.findById(journalId);
        if (!journal) {
            return res.status(404).json({ message: 'Journal not found' });
        }

        if (String(journal.expertId) !== String(expertId)) {
            return res.status(403).json({ message: 'This journal does not belong to the expert' });
        }

        await Journal.findByIdAndDelete(journalId);
        return res.status(200).json({ message: 'Journal deleted successfully' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/overview/:expertId', async (req, res) => {
    try {
        const { expertId } = req.params;

        const expertResult = await assertExpert(expertId);
        if (expertResult.error) {
            return res.status(expertResult.status).json({ message: expertResult.error });
        }

        const projects = await Project.find({ expertId }).sort({ createdAt: -1 }).lean();
        const projectIds = projects.map((project) => project._id);

        const chantiers = await Chantier.find({ projectId: { $in: projectIds } })
            .populate('assignments.artisanId', 'name email')
            .lean();

        const journals = await Journal.find({ projectId: { $in: projectIds } })
            .populate('projectId', 'name')
            .populate('chantierId', 'name')
            .populate('artisanRecipientIds', 'name email')
            .sort({ activityDate: -1 })
            .lean();

        const chantiersByProject = chantiers.reduce((accumulator, chantier) => {
            const key = String(chantier.projectId);
            if (!accumulator[key]) {
                accumulator[key] = [];
            }
            accumulator[key].push(chantier);
            return accumulator;
        }, {});

        const journalsByProject = journals.reduce((accumulator, journal) => {
            const key = String(journal.projectId);
            if (!accumulator[key]) {
                accumulator[key] = [];
            }
            accumulator[key].push(journal);
            return accumulator;
        }, {});

        const trackedProjects = projects.map((project) => {
            const projectChantiers = chantiersByProject[String(project._id)] || [];
            const projectJournals = journalsByProject[String(project._id)] || [];

            const totalProgress = projectChantiers.reduce(
                (sum, chantier) => sum + Number(chantier.progressPercentage || 0),
                0
            );
            const trackedProgress = projectChantiers.length
                ? Number((totalProgress / projectChantiers.length).toFixed(1))
                : 0;

            const spentBudget = projectChantiers.reduce((sum, chantier) => sum + Number(chantier.spentBudget || 0), 0);
            const allocatedBudget = projectChantiers.reduce(
                (sum, chantier) => sum + Number(chantier.allocatedBudget || 0),
                0
            );
            const budgetUsagePercentage =
                Number(project.totalBudget || 0) > 0
                    ? Number(((spentBudget / Number(project.totalBudget)) * 100).toFixed(1))
                    : 0;

            return {
                ...project,
                trackedProgress,
                spentBudget,
                allocatedBudget,
                budgetUsagePercentage,
                chantiers: projectChantiers,
                journals: projectJournals,
                journalsCount: projectJournals.length,
                latestJournalAt: projectJournals[0]?.activityDate || null,
            };
        });

        return res.status(200).json({
            projects: trackedProjects,
            journals,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
