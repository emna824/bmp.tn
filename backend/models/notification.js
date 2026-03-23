const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: {
            type: String,
            enum: ['product', 'assignment', 'system'],
            required: true,
        },
        title: { type: String, required: true, trim: true },
        message: { type: String, default: '', trim: true },
        metadata: { type: Object, default: {} },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Notification', notificationSchema)
