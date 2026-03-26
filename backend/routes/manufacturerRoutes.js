const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/user');
const Product = require('../models/product');
const Notification = require('../models/notification');

const router = express.Router();

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

async function assertManufacturer(manufacturerId) {
    if (!isValidObjectId(manufacturerId)) {
        return { error: 'Invalid manufacturerId', status: 400 };
    }

    const manufacturer = await User.findById(manufacturerId).select('role');
    if (!manufacturer || manufacturer.role !== 'manufacturer') {
        return { error: 'Manufacturer not found', status: 404 };
    }

    return { manufacturer };
}

const MAX_DOCUMENT_LENGTH = 12_000_000; // ~12 MB string length
const MAX_IMAGE_LENGTH = 8_000_000; // ~8 MB string length
const DOCUMENT_PREFIX = 'data:application/pdf;base64,';
const IMAGE_PREFIX = /^data:image\/(png|jpe?g|webp);base64,/i;

// Debug logger for product routes
router.use('/products', (req, res, next) => {
    console.log(`[product:req] ${req.method} body keys:`, Object.keys(req.body || {}));
    next();
});

router.post('/products', async (req, res) => {
    try {
        const { manufacturerId, name, description, document, documentName, price, priceUnit, image } = req.body;
        console.log('[product:create] incoming', {
            manufacturerId,
            name,
            hasDoc: Boolean(document),
            hasImage: Boolean(image),
            price,
            priceUnit,
        });

        if (!manufacturerId || !name || !document || !documentName) {
            return res
                .status(400)
                .json({ message: 'manufacturerId, name, document and documentName are required' });
        }

        const manufacturerCheck = await assertManufacturer(manufacturerId);
        if (manufacturerCheck.error) {
            return res.status(manufacturerCheck.status).json({ message: manufacturerCheck.error });
        }

        if (!String(name).trim()) {
            return res.status(400).json({ message: 'name is required' });
        }

        if (!String(documentName).trim()) {
            return res.status(400).json({ message: 'documentName is required' });
        }

        const normalizedDocument = String(document).trim();
        if (!normalizedDocument.startsWith(DOCUMENT_PREFIX)) {
            return res.status(400).json({ message: 'document must be a PDF (data URL)' });
        }

        if (normalizedDocument.length > MAX_DOCUMENT_LENGTH) {
            return res.status(400).json({ message: 'document exceeds the allowed size', maxBytes: MAX_DOCUMENT_LENGTH });
        }

        let normalizedImage = '';
        if (image) {
            normalizedImage = String(image).trim();
            if (!IMAGE_PREFIX.test(normalizedImage)) {
                return res.status(400).json({ message: 'image must be PNG, JPG or WEBP data URL' });
            }
            if (normalizedImage.length > MAX_IMAGE_LENGTH) {
                return res
                    .status(400)
                    .json({ message: 'image exceeds the allowed size', maxBytes: MAX_IMAGE_LENGTH });
            }
        }

        let numericPrice = null;
        if (typeof price !== 'undefined' && price !== null && price !== '') {
            const parsed = Number(price);
            if (Number.isNaN(parsed) || parsed < 0) {
                return res.status(400).json({ message: 'price must be a positive number' });
            }
            numericPrice = parsed;
        }

        const createdProduct = await Product.create({
            manufacturerId,
            name: String(name).trim(),
            description: String(description || '').trim(),
            documentName: String(documentName).trim(),
            document: normalizedDocument,
            price: numericPrice,
            priceUnit: String(priceUnit || 'TND').trim(),
            image: normalizedImage,
        });

        // notify artisans and experts about new marketplace item
        try {
            const recipients = await User.find({ role: { $in: ['expert', 'artisan'] } }).select('_id').lean();
            if (recipients.length) {
                const docs = recipients.map((u) => ({
                    userId: u._id,
                    type: 'product',
                    title: 'New marketplace document',
                    message: `${name} was added to the marketplace`,
                    metadata: {
                        productId: createdProduct._id,
                        documentName: createdProduct.documentName,
                        manufacturerId,
                    },
                }));
                await Notification.insertMany(docs, { ordered: false });
            }
        } catch (notifyErr) {
            console.error('Failed to fan-out product notification', notifyErr);
        }

        return res.status(201).json({
            message: 'Product created successfully',
            product: {
                id: createdProduct._id,
                name: createdProduct.name,
                description: createdProduct.description,
                documentName: createdProduct.documentName,
                price: createdProduct.price,
                priceUnit: createdProduct.priceUnit,
                image: createdProduct.image,
                manufacturerId: createdProduct.manufacturerId,
                createdAt: createdProduct.createdAt,
            },
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/products', async (req, res) => {
    try {
        const { manufacturerId } = req.query;
        const filter = {};

        if (manufacturerId) {
            if (!isValidObjectId(manufacturerId)) {
                return res.status(400).json({ message: 'Invalid manufacturerId' });
            }
            filter.manufacturerId = manufacturerId;
        }

        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .populate('manufacturerId', 'name patent address companyPhone')
            .lean();

        const sanitized = products.map((product) => ({
            id: product._id,
            name: product.name,
            description: product.description,
            documentName: product.documentName,
            price: product.price,
            priceUnit: product.priceUnit || 'TND',
            image: product.image || '',
            manufacturer: product.manufacturerId
                ? {
                      id: product.manufacturerId._id,
                      name: product.manufacturerId.name,
                      patent: product.manufacturerId.patent || '',
                      address: product.manufacturerId.address || '',
                      companyPhone: product.manufacturerId.companyPhone || '',
                  }
                : null,
            createdAt: product.createdAt,
        }));

        return res.status(200).json({ products: sanitized });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/products/:productId/document', async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId || !isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Valid productId is required' });
        }

        const product = await Product.findById(productId).lean();
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        return res.status(200).json({
            id: product._id,
            document: product.document,
            documentName: product.documentName,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
