const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            default: null,
            index: true,
        },
        actionType: {
            type: String,
            enum: ['ban_user', 'delete_product', 'reject_report'],
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: ['user', 'product', 'report'],
            required: true,
            index: true,
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        targetLabel: {
            type: String,
            default: '',
            trim: true,
            maxlength: 300,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

module.exports = mongoose.model('AdminActionLog', adminActionLogSchema);
