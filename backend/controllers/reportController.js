const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/user');
const path = require('path');
const Product = require('../models/product');
const AdminActionLog = require('../models/AdminActionLog');

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function isDuplicateKeyError(error) {
    return error && error.code === 11000;
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function mapUserSummary(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id || String(user._id),
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        isBanned: Boolean(user.isBanned),
        banType: user.banType || null,
        banExpiresAt: user.banExpiresAt || null,
    };
}

function mapProductSummary(product) {
    if (!product) {
        return null;
    }

    const documentation = product.documentation || '';

    return {
        id: product.id || String(product._id),
        name: product.name || '',
        description: product.description || '',
        price: product.price ?? null,
        documentation,
        documentName: documentation ? path.basename(documentation) : '',
        manufacturerId:
            typeof product.manufacturerId === 'object' && product.manufacturerId !== null
                ? product.manufacturerId.id || String(product.manufacturerId._id)
                : product.manufacturerId || null,
    };
}

function mapReport(report, target = undefined) {
    const response = {
        id: report.id || String(report._id),
        reporterId:
            typeof report.reporterId === 'object' && report.reporterId !== null
                ? report.reporterId.id || String(report.reporterId._id)
                : String(report.reporterId),
        reporter:
            typeof report.reporterId === 'object' && report.reporterId !== null
                ? mapUserSummary(report.reporterId)
                : null,
        targetType: report.targetType,
        targetId: String(report.targetId),
        reason: report.reason,
        description: report.description || '',
        status: report.status,
        reviewedBy:
            typeof report.reviewedBy === 'object' && report.reviewedBy !== null
                ? mapUserSummary(report.reviewedBy)
                : report.reviewedBy
                ? { id: String(report.reviewedBy) }
                : null,
        reviewedAt: report.reviewedAt || null,
        createdAt: report.createdAt,
    };

    if (typeof target !== 'undefined') {
        response.target =
            report.targetType === 'user' ? mapUserSummary(target) : mapProductSummary(target);
    }

    return response;
}

function mapAdminActionLog(log) {
    if (!log) {
        return null;
    }

    return {
        id: log.id || String(log._id),
        actionType: log.actionType,
        targetType: log.targetType,
        targetId: String(log.targetId),
        targetLabel: log.targetLabel || '',
        reportId:
            typeof log.reportId === 'object' && log.reportId !== null
                ? log.reportId.id || String(log.reportId._id)
                : log.reportId
                ? String(log.reportId)
                : null,
        admin:
            typeof log.adminId === 'object' && log.adminId !== null
                ? mapUserSummary(log.adminId)
                : log.adminId
                ? { id: String(log.adminId) }
                : null,
        metadata: log.metadata || {},
        createdAt: log.createdAt,
    };
}

async function findTarget(targetType, targetId) {
    if (targetType === 'user') {
        return User.findById(targetId).select('name email role isBanned banType banExpiresAt');
    }

    if (targetType === 'product') {
        return Product.findById(targetId).select('name description price documentation manufacturerId');
    }

    return null;
}

function validateReportFilters(status, targetType) {
    const allowedStatuses = ['pending', 'reviewed', 'resolved'];
    const allowedTargetTypes = ['user', 'product'];

    if (status && !allowedStatuses.includes(status)) {
        return { status: 400, message: 'status must be pending, reviewed, or resolved' };
    }

    if (targetType && !allowedTargetTypes.includes(targetType)) {
        return { status: 400, message: 'targetType must be user or product' };
    }

    return null;
}

function validateAdminActionLogFilters(actionType, targetType, adminId) {
    const allowedActionTypes = ['ban_user', 'delete_product', 'reject_report'];
    const allowedTargetTypes = ['user', 'product', 'report'];

    if (actionType && !allowedActionTypes.includes(actionType)) {
        return {
            status: 400,
            message: 'actionType must be ban_user, delete_product, or reject_report',
        };
    }

    if (targetType && !allowedTargetTypes.includes(targetType)) {
        return {
            status: 400,
            message: 'targetType must be user, product, or report',
        };
    }

    if (adminId && !isValidObjectId(adminId)) {
        return {
            status: 400,
            message: 'adminId must be a valid ObjectId',
        };
    }

    return null;
}

function validateUserBanPayload(body) {
    const banType = normalizeString(body?.banType).toLowerCase();
    if (!['temporary', 'permanent'].includes(banType)) {
        return { error: { status: 400, message: 'banType must be temporary or permanent' } };
    }

    if (banType === 'temporary') {
        const parsedExpiry = new Date(body?.banExpiresAt);
        if (!body?.banExpiresAt || Number.isNaN(parsedExpiry.getTime())) {
            return {
                error: {
                    status: 400,
                    message: 'banExpiresAt is required for a temporary ban and must be a valid date',
                },
            };
        }

        if (parsedExpiry <= new Date()) {
            return {
                error: {
                    status: 400,
                    message: 'banExpiresAt must be in the future for a temporary ban',
                },
            };
        }

        return { value: { banType, banExpiresAt: parsedExpiry } };
    }

    return { value: { banType, banExpiresAt: null } };
}

async function createAdminActionLog({
    adminId,
    reportId = null,
    actionType,
    targetType,
    targetId,
    targetLabel = '',
    metadata = {},
}) {
    return AdminActionLog.create({
        adminId,
        reportId,
        actionType,
        targetType,
        targetId,
        targetLabel,
        metadata,
    });
}

async function createReport(req, res) {
    try {
        const reporterId = req.user?._id;
        const targetType = normalizeString(req.body?.targetType).toLowerCase();
        const targetId = normalizeString(req.body?.targetId);
        const reason = normalizeString(req.body?.reason);
        const description = normalizeString(req.body?.description);

        const filterError = validateReportFilters(undefined, targetType);
        if (filterError) {
            return res.status(filterError.status).json({ message: filterError.message });
        }

        if (!reporterId) {
            return res.status(401).json({ message: 'Authenticated user is required' });
        }

        if (!targetId || !isValidObjectId(targetId)) {
            return res.status(400).json({ message: 'targetId must be a valid ObjectId' });
        }

        if (!reason) {
            return res.status(400).json({ message: 'reason is required' });
        }

        const target = await findTarget(targetType, targetId);
        if (!target) {
            return res.status(404).json({ message: `${targetType} target not found` });
        }

        const existingReport = await Report.findOne({
            reporterId,
            targetType,
            targetId,
        }).select('_id');

        if (existingReport) {
            return res.status(409).json({ message: 'You have already reported this target' });
        }

        const report = await Report.create({
            reporterId,
            targetType,
            targetId,
            reason,
            description,
        });

        const populatedReport = await Report.findById(report._id).populate('reporterId', 'name email role');

        return res.status(201).json({
            message: 'Report submitted successfully',
            report: mapReport(populatedReport, target),
        });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({ message: 'You have already reported this target' });
        }

        return res.status(500).json({ message: error.message || 'Failed to create report' });
    }
}

async function getAllReports(req, res) {
    try {
        const status = normalizeString(req.query?.status).toLowerCase();
        const targetType = normalizeString(req.query?.targetType).toLowerCase();

        const filterError = validateReportFilters(status, targetType);
        if (filterError) {
            return res.status(filterError.status).json({ message: filterError.message });
        }

        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (targetType) {
            filter.targetType = targetType;
        }

        const reports = await Report.find(filter)
            .populate('reporterId', 'name email role')
            .populate('reviewedBy', 'name email role')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            reports: reports.map((report) => mapReport(report)),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to fetch reports' });
    }
}

async function getAdminActionLogs(req, res) {
    try {
        const actionType = normalizeString(req.query?.actionType).toLowerCase();
        const targetType = normalizeString(req.query?.targetType).toLowerCase();
        const adminId = normalizeString(req.query?.adminId);

        const filterError = validateAdminActionLogFilters(actionType, targetType, adminId);
        if (filterError) {
            return res.status(filterError.status).json({ message: filterError.message });
        }

        const filter = {};
        if (actionType) {
            filter.actionType = actionType;
        }
        if (targetType) {
            filter.targetType = targetType;
        }
        if (adminId) {
            filter.adminId = adminId;
        }

        const logs = await AdminActionLog.find(filter)
            .populate('adminId', 'name email role')
            .populate('reportId', 'targetType targetId reason status')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            logs: logs.map((log) => mapAdminActionLog(log)),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to fetch admin action logs' });
    }
}

async function getReportById(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid report id' });
        }

        const report = await Report.findById(id)
            .populate('reporterId', 'name email role')
            .populate('reviewedBy', 'name email role');

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const target = await findTarget(report.targetType, report.targetId);

        return res.status(200).json({ report: mapReport(report, target) });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to fetch report' });
    }
}

async function resolveReport(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid report id' });
        }

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending reports can be resolved' });
        }

        let target = await findTarget(report.targetType, report.targetId);

        if (report.targetType === 'product') {
            if (target) {
                await Product.deleteOne({ _id: report.targetId });
            }

            await createAdminActionLog({
                adminId: req.user._id,
                reportId: report._id,
                actionType: 'delete_product',
                targetType: 'product',
                targetId: report.targetId,
                targetLabel: target?.name || target?.documentName || '',
                metadata: {
                    reportReason: report.reason,
                    reportDescription: report.description || '',
                    product: mapProductSummary(target),
                    reporterId: String(report.reporterId),
                },
            });
        } else {
            const validation = validateUserBanPayload(req.body);
            if (validation.error) {
                return res.status(validation.error.status).json({ message: validation.error.message });
            }

            if (target) {
                target.isBanned = true;
                target.banType = validation.value.banType;
                target.banExpiresAt = validation.value.banExpiresAt;
                await target.save();
            }

            await createAdminActionLog({
                adminId: req.user._id,
                reportId: report._id,
                actionType: 'ban_user',
                targetType: 'user',
                targetId: report.targetId,
                targetLabel: target?.email || target?.name || '',
                metadata: {
                    reportReason: report.reason,
                    reportDescription: report.description || '',
                    banType: validation.value.banType,
                    banExpiresAt: validation.value.banExpiresAt,
                    user: mapUserSummary(target),
                    reporterId: String(report.reporterId),
                },
            });
        }

        report.status = 'resolved';
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        await report.save();

        const populatedReport = await Report.findById(report._id)
            .populate('reporterId', 'name email role')
            .populate('reviewedBy', 'name email role');

        target = await findTarget(report.targetType, report.targetId);

        return res.status(200).json({
            message: 'Report resolved successfully',
            report: mapReport(populatedReport, target),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to resolve report' });
    }
}

async function rejectReport(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid report id' });
        }

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending reports can be rejected' });
        }

        report.status = 'reviewed';
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        await report.save();

        await createAdminActionLog({
            adminId: req.user._id,
            reportId: report._id,
            actionType: 'reject_report',
            targetType: 'report',
            targetId: report._id,
            targetLabel: `${report.targetType}:${String(report.targetId)}`,
            metadata: {
                reportReason: report.reason,
                reportDescription: report.description || '',
                originalTargetType: report.targetType,
                originalTargetId: String(report.targetId),
                reporterId: String(report.reporterId),
            },
        });

        const populatedReport = await Report.findById(report._id)
            .populate('reporterId', 'name email role')
            .populate('reviewedBy', 'name email role');

        const target = await findTarget(report.targetType, report.targetId);

        return res.status(200).json({
            message: 'Report rejected successfully',
            report: mapReport(populatedReport, target),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to reject report' });
    }
}

module.exports = {
    createReport,
    getAllReports,
    getAdminActionLogs,
    getReportById,
    resolveReport,
    rejectReport,
};
