const express = require('express');
const multer = require('multer');
const loadRequestUser = require('../middleware/loadRequestUser');
const checkProductOwnership = require('../middleware/checkProductOwnership');
const productUpload = require('../middleware/productUpload');
const {
    createProduct,
    getAllProducts,
    getProductById,
    getProductDocument,
    getProductsByManufacturer,
    updateProduct,
    deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

const uploadProductFiles = productUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'documentation', maxCount: 1 },
]);

function handleProductUpload(req, res, next) {
    uploadProductFiles(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: error.message });
        }

        return res.status(400).json({ message: error.message || 'Invalid uploaded files' });
    });
}

router.get('/', getAllProducts);
router.get('/manufacturer/:id', getProductsByManufacturer);
router.get('/:id/document', getProductDocument);
router.get('/:id', getProductById);
router.post('/', loadRequestUser, handleProductUpload, createProduct);
router.put('/:id', loadRequestUser, checkProductOwnership, handleProductUpload, updateProduct);
router.delete('/:id', loadRequestUser, checkProductOwnership, deleteProduct);

module.exports = router;
