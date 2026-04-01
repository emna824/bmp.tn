const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const IMAGE_DIRECTORY = path.join(UPLOAD_ROOT, 'products', 'images');
const DOCUMENT_DIRECTORY = path.join(UPLOAD_ROOT, 'products', 'documentation');

[IMAGE_DIRECTORY, DOCUMENT_DIRECTORY].forEach((directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
});

function buildFilename(originalName) {
    const extension = path.extname(originalName || '').toLowerCase();
    const baseName = path
        .basename(originalName || 'file', extension)
        .replace(/[^a-z0-9_-]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName || 'upload'}${extension}`;
}

const storage = multer.diskStorage({
    destination: (_req, file, callback) => {
        if (file.fieldname === 'documentation') {
            return callback(null, DOCUMENT_DIRECTORY);
        }

        if (file.fieldname === 'image') {
            return callback(null, IMAGE_DIRECTORY);
        }

        return callback(new Error(`Unsupported upload field: ${file.fieldname}`));
    },
    filename: (_req, file, callback) => {
        callback(null, buildFilename(file.originalname));
    },
});

function fileFilter(_req, file, callback) {
    if (file.fieldname === 'documentation') {
        if (file.mimetype === 'application/pdf') {
            return callback(null, true);
        }

        return callback(new Error('Only PDF files are allowed for documentation'));
    }

    if (file.fieldname === 'image') {
        if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
            return callback(null, true);
        }

        return callback(new Error('Only JPG and PNG images are allowed'));
    }

    return callback(new Error(`Unsupported upload field: ${file.fieldname}`));
}

const productUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 8 * 1024 * 1024,
    },
});

module.exports = productUpload;
