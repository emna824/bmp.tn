const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        artisanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        jobTitle: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending',
        },
        invitedAt: { type: Date, default: Date.now },
        respondedAt: { type: Date },
    },
    { _id: false }
);

const chantierSchema = new mongoose.Schema(
    {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '', trim: true },
        progressPercentage: { type: Number, min: 0, max: 100, default: 0 },
        allocatedBudget: { type: Number, min: 0, default: 0 },
        spentBudget: { type: Number, min: 0, default: 0 },
        assignments: [assignmentSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Chantier', chantierSchema);
