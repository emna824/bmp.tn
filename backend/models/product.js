const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        manufacturerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        documentName: {
            type: String,
            required: true,
            trim: true,
        },
        document: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
