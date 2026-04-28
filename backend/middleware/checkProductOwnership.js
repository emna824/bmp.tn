const mongoose = require('mongoose');
const Product = require('../models/Product');

module.exports = async function checkProductOwnership(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authenticated user is required' });
        }

        if (req.user.role !== 'manufacturer') {
            return res.status(403).json({ message: 'Only manufacturers can manage products' });
        }

        const productId = String(req.params?.id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product id' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (String(product.manufacturerId) !== String(req.user.id || req.user._id)) {
            return res.status(403).json({ message: 'You can only modify your own products' });
        }

        req.product = product;
        return next();
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to verify product ownership' });
    }
};
