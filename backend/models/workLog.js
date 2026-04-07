const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema(
  {
    artisanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    description: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['done', 'not_done'],
      default: 'not_done',
      required: true,
    },
  },
  { timestamps: true }
);

workLogSchema.index({ artisanId: 1, milestoneId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkLog', workLogSchema);
