const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    artisanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

milestoneSchema.path('endDate').validate(function validateEndDate(value) {
  if (!value || !this.startDate) {
    return true;
  }

  return value >= this.startDate;
}, 'endDate must be after startDate');

module.exports = mongoose.model('Milestone', milestoneSchema);
