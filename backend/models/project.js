const mongoose = require('mongoose');
const { TRADES } = require('../constants/trades');

const teamRequirementSchema = new mongoose.Schema(
  {
    job: { type: String, required: true, trim: true, lowercase: true },
    required: { type: Number, required: true, min: 1 },
    assigned: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, trim: true, alias: 'title' },
    location: { type: locationSchema, required: true },
    estimatedBudget: { type: Number, required: true, min: 0, alias: 'budget' },
    category: { type: String, required: true, enum: ['construction', 'renovation'] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, alias: 'deadline' },
    job: { type: String, required: true, enum: TRADES, lowercase: true, trim: true },
    dailySalary: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
    expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, default: 'open', enum: ['open', 'in_progress', 'closed'] },
    teamRequirements: { type: [teamRequirementSchema], default: [] },
  },
  { timestamps: true }
);

projectSchema.path('teamRequirements').validate(function validateTeamRequirements(requirements) {
  return (requirements || []).every((requirement) => requirement.assigned <= requirement.required);
}, 'assigned cannot exceed required for any team requirement');

projectSchema.path('location').validate(function validateLocation(value) {
  return Boolean(
    value &&
      value.address &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude)
  );
}, 'location must include address, latitude, and longitude');

projectSchema.path('endDate').validate(function validateEndDate(value) {
  if (!value || !this.startDate) {
    return true;
  }
  return value >= this.startDate;
}, 'endDate must be after startDate');

module.exports = mongoose.model('Project', projectSchema);
