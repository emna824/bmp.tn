const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0.01,
    },
    stock: {
        type: Number,
        default: 1,
        min: 0,
    },
    documentation: {
        type: String,
        default: '',
        trim: true,
    },
    document: {
        type: String,
        default: '',
        trim: true,
    },
    documentName: {
        type: String,
        default: '',
        trim: true,
    },
    image: {
        type: String,
        default: '',
        trim: true,
    },
    postedDate: {
        type: Date,
        default: Date.now,
    },
    manufacturerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
});

module.exports = mongoose.model('Product', productSchema);
