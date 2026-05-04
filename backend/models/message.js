const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
      maxlength: 4000,
    },
    audioUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

messageSchema.index({ projectId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
