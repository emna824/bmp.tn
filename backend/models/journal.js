const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema(
    {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
        chantierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chantier', required: true },
        expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        activityDate: { type: Date, required: true },
        activities: [{ type: String, trim: true }],
        artisanRecipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Journal', journalSchema);
