const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: {
            type: String,
            enum: ['new_project', 'application_accepted', 'application_rejected'],
            required: true,
        },
        message: { type: String, required: true, trim: true },
        relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
)

notificationSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
