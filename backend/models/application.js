const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    artisanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    job: { type: String, required: true, trim: true, lowercase: true },
    proposedDailySalary: { type: Number, min: 0, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

applicationSchema.index({ artisanId: 1, projectId: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
