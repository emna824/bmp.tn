const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    job: { type: String, required: true, trim: true, lowercase: true },
    requiredSlots: { type: Number, required: true, min: 1 },
    availableSlots: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

offerSchema.index({ projectId: 1, job: 1 }, { unique: true });

offerSchema.path('availableSlots').validate(function validateSlots(value) {
  return value <= this.requiredSlots;
}, 'availableSlots cannot exceed requiredSlots');

module.exports = mongoose.model('Offer', offerSchema);
