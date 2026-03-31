const mongoose = require('mongoose');

const chantierSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    location: { type: String, default: 'TBD', trim: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chantier', chantierSchema);
