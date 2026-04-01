const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
    {
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: ['user', 'product'],
            required: true,
            index: true,
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300,
        },
        description: {
            type: String,
            default: '',
            trim: true,
            maxlength: 2000,
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved'],
            default: 'pending',
            index: true,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: undefined,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

reportSchema.index(
    { reporterId: 1, targetType: 1, targetId: 1 },
    { unique: true, name: 'unique_report_per_reporter_target' }
);

module.exports = mongoose.model('Report', reportSchema);
