const express = require('express')
const mongoose = require('mongoose')
const Notification = require('../models/notification')

const router = express.Router()

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params
        const { unreadOnly } = req.query

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid userId' })
        }

        const filter = { userId }
        if (String(unreadOnly) === 'true') {
            filter.read = false
        }

        const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean()
        const unreadCount = await Notification.countDocuments({ userId, read: false })

        return res.status(200).json({ notifications, unreadCount })
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
})

router.post('/:userId/read-all', async (req, res) => {
    try {
        const { userId } = req.params
        if (!isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid userId' })
        }

        await Notification.updateMany({ userId, read: false }, { $set: { read: true } })
        return res.status(200).json({ message: 'Notifications marked as read' })
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
})

module.exports = router
