const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/product');

const MANUFACTURER_PROJECTION = 'name email role';

function isValidObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value);
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizePositivePrice(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function normalizeStock(value, fallbackValue = 1) {
    if (typeof value === 'undefined' || value === null || value === '') {
        return fallbackValue;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
}

function buildValidationError(message, status = 400) {
    return { message, status };
}

function getUploadedFile(req, fieldName) {
    const files = req.files?.[fieldName];
    return Array.isArray(files) && files.length ? files[0] : null;
}

function getBodyFileValue(req, fieldNames) {
    for (const fieldName of fieldNames) {
        const value = normalizeString(req.body?.[fieldName]);
        if (value) {
            return value;
        }
    }

    return '';
}

function buildFileUrl(req, file) {
    if (!file) {
        return '';
    }

    const backendRoot = path.join(__dirname, '..');
    const relativePath = path.relative(backendRoot, file.path).split(path.sep).join('/');
    return `${req.protocol}://${req.get('host')}/${relativePath}`;
}

function getFilenameFromUrl(fileUrl) {
    const normalized = normalizeString(fileUrl);
    if (!normalized) {
        return '';
    }

    const safeValue = normalized.split('?')[0].split('#')[0];
    const segments = safeValue.split('/');
    return segments[segments.length - 1] || '';
}

function buildFileReference(req, file, fallbackValue = '') {
    if (file) {
        return buildFileUrl(req, file);
    }

    return normalizeString(fallbackValue);
}

function getLocalFilePathFromUrl(fileUrl) {
    const normalized = normalizeString(fileUrl);
    if (!normalized) {
        return '';
    }

    try {
        const parsed = new URL(normalized);
        return parsed.pathname.replace(/^\/+/, '');
    } catch (_error) {
        return normalized.replace(/^\/+/, '');
    }
}

function removeStoredFile(fileUrl) {
    const relativePath = getLocalFilePathFromUrl(fileUrl);
    if (!relativePath) {
        return;
    }

    const absolutePath = path.join(__dirname, '..', relativePath);
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
    }
}

function cleanupUploadedFiles(filesByField = {}) {
    Object.values(filesByField).forEach((files) => {
        if (!Array.isArray(files)) {
            return;
        }

        files.forEach((file) => {
            if (file?.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
    });
}

function sendError(res, error, fallbackMessage, status = 500) {
    return res.status(status).json({ message: error?.message || fallbackMessage });
}

function sendCleanupError(res, filesByField, error, fallbackMessage, status = 500) {
    cleanupUploadedFiles(filesByField);
    return sendError(res, error, fallbackMessage, status);
}

function getValidatedRouteId(value, label) {
    if (!isValidObjectId(value)) {
        return { error: buildValidationError(`Invalid ${label} id`) };
    }

    return { value };
}

function serializeManufacturer(manufacturer) {
    if (!manufacturer || typeof manufacturer !== 'object') {
        return null;
    }

    return {
        id: manufacturer.id || String(manufacturer._id),
        name: manufacturer.name || '',
        email: manufacturer.email || '',
        role: manufacturer.role || '',
    };
}

function serializeProduct(product) {
    const manufacturer =
        product.manufacturerId && typeof product.manufacturerId === 'object'
            ? serializeManufacturer(product.manufacturerId)
            : {
                  id: String(product.manufacturerId),
              };

    return {
        id: product.id || String(product._id),
        name: product.name || '',
        description: product.description || '',
        price: product.price,
        stock: Number.isInteger(product.stock) ? product.stock : 1,
        documentation: product.documentation || product.document || '',
        document: product.documentation || product.document || '',
        documentName: product.documentName || getFilenameFromUrl(product.documentation || product.document),
        image: product.image || '',
        postedDate: product.postedDate || null,
        createdAt: product.postedDate || null,
        manufacturerId: manufacturer?.id || '',
        manufacturer,
    };
}

function ensureAuthenticatedManufacturer(req) {
    if (!req.user) {
        return { error: buildValidationError('Authenticated user is required', 401) };
    }

    if (req.user.role !== 'manufacturer') {
        return { error: buildValidationError('Only manufacturers can manage products', 403) };
    }

    return { manufacturerId: req.user.id || String(req.user._id) };
}

function getProductPayload(req, currentProduct = null) {
    const name =
        typeof req.body?.name === 'undefined'
            ? currentProduct?.name || ''
            : normalizeString(req.body.name);
    const description =
        typeof req.body?.description === 'undefined'
            ? currentProduct?.description || ''
            : normalizeString(req.body.description);
    const price =
        typeof req.body?.price === 'undefined'
            ? currentProduct?.price
            : normalizePositivePrice(req.body.price);
    const stock =
        typeof req.body?.stock === 'undefined'
            ? Number.isInteger(currentProduct?.stock)
                ? currentProduct.stock
                : 1
            : normalizeStock(req.body.stock, 1);

    if (!name) {
        return { error: buildValidationError('name is required') };
    }

    if (!description) {
        return { error: buildValidationError('description is required') };
    }

    if (!price) {
        return { error: buildValidationError('price must be a positive number') };
    }

    if (stock === null) {
        return { error: buildValidationError('stock must be a non-negative integer') };
    }

    return {
        value: {
            name,
            description,
            price,
            stock,
            documentationFile: getUploadedFile(req, 'documentation'),
            documentationValue: getBodyFileValue(req, ['documentation', 'document']),
            imageFile: getUploadedFile(req, 'image'),
            imageValue: getBodyFileValue(req, ['image']),
            documentName: normalizeString(req.body?.documentName),
        },
    };
}

async function populateManufacturer(product) {
    await product.populate('manufacturerId', MANUFACTURER_PROJECTION);
    return product;
}

async function listProducts(filter = {}) {
    return Product.find(filter)
        .sort({ postedDate: -1 })
        .populate('manufacturerId', MANUFACTURER_PROJECTION);
}

function applyProductUpdates(product, payload, req) {
    product.name = payload.name;
    product.description = payload.description;
    product.price = payload.price;
    product.stock = payload.stock;

    const nextDocumentation = buildFileReference(req, payload.documentationFile, payload.documentationValue);
    if (nextDocumentation) {
        product.documentation = nextDocumentation;
        product.document = nextDocumentation;
    }

    const nextImage = buildFileReference(req, payload.imageFile, payload.imageValue);
    if (nextImage) {
        product.image = nextImage;
    }

    if (payload.documentName) {
        product.documentName = payload.documentName;
    } else if (nextDocumentation) {
        product.documentName = getFilenameFromUrl(nextDocumentation);
    }
}

async function createProduct(req, res) {
    try {
        const auth = ensureAuthenticatedManufacturer(req);
        if (auth.error) {
            return sendCleanupError(
                res,
                req.files,
                auth.error,
                'Only manufacturers can manage products',
                auth.error.status
            );
        }

        const payload = getProductPayload(req);
        if (payload.error) {
            return sendCleanupError(
                res,
                req.files,
                payload.error,
                'Invalid product payload',
                payload.error.status
            );
        }

        const product = await Product.create({
            name: payload.value.name,
            description: payload.value.description,
            price: payload.value.price,
            stock: payload.value.stock,
            documentation: buildFileReference(req, payload.value.documentationFile, payload.value.documentationValue),
            document: buildFileReference(req, payload.value.documentationFile, payload.value.documentationValue),
            documentName:
                payload.value.documentName ||
                getFilenameFromUrl(
                    buildFileReference(req, payload.value.documentationFile, payload.value.documentationValue)
                ),
            image: buildFileReference(req, payload.value.imageFile, payload.value.imageValue),
            manufacturerId: auth.manufacturerId,
        });

        await populateManufacturer(product);

        return res.status(201).json({
            message: 'Product created successfully',
            product: serializeProduct(product),
        });
    } catch (error) {
        return sendCleanupError(res, req.files, error, 'Failed to create product');
    }
}

async function getAllProducts(req, res) {
    try {
        const manufacturerId = normalizeString(req.query?.manufacturerId);
        const filter = {};

        if (manufacturerId) {
            const validatedId = getValidatedRouteId(manufacturerId, 'manufacturer');
            if (validatedId.error) {
                return sendError(
                    res,
                    validatedId.error,
                    'Invalid manufacturer id',
                    validatedId.error.status
                );
            }
            filter.manufacturerId = validatedId.value;
        }

        const products = await listProducts(filter);

        return res.status(200).json({
            products: products.map((product) => serializeProduct(product)),
        });
    } catch (error) {
        return sendError(res, error, 'Failed to fetch products');
    }
}

async function getProductById(req, res) {
    try {
        const { id } = req.params;
        const validatedId = getValidatedRouteId(id, 'product');
        if (validatedId.error) {
            return sendError(res, validatedId.error, 'Invalid product id', validatedId.error.status);
        }

        const product = await Product.findById(validatedId.value).populate(
            'manufacturerId',
            MANUFACTURER_PROJECTION
        );
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        return res.status(200).json({ product: serializeProduct(product) });
    } catch (error) {
        return sendError(res, error, 'Failed to fetch product');
    }
}

async function getProductsByManufacturer(req, res) {
    try {
        const { id } = req.params;
        const validatedId = getValidatedRouteId(id, 'manufacturer');
        if (validatedId.error) {
            return sendError(
                res,
                validatedId.error,
                'Invalid manufacturer id',
                validatedId.error.status
            );
        }

        const products = await listProducts({ manufacturerId: validatedId.value });

        return res.status(200).json({
            products: products.map((product) => serializeProduct(product)),
        });
    } catch (error) {
        return sendError(res, error, 'Failed to fetch manufacturer products');
    }
}

async function getProductDocument(req, res) {
    try {
        const { id } = req.params;
        const validatedId = getValidatedRouteId(id, 'product');
        if (validatedId.error) {
            return sendError(res, validatedId.error, 'Invalid product id', validatedId.error.status);
        }

        const product = await Product.findById(validatedId.value).select(
            'documentation document documentName'
        );
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const documentValue = product.documentation || product.document || '';

        return res.status(200).json({
            id: product.id || String(product._id),
            document: documentValue,
            documentName: product.documentName || getFilenameFromUrl(documentValue),
        });
    } catch (error) {
        return sendError(res, error, 'Failed to fetch product document');
    }
}

async function updateProduct(req, res) {
    try {
        const product = req.product;
        if (!product) {
            return sendCleanupError(
                res,
                req.files,
                buildValidationError('Owned product is missing from request context', 500),
                'Owned product is missing from request context',
                500
            );
        }

        const payload = getProductPayload(req, product);
        if (payload.error) {
            return sendCleanupError(
                res,
                req.files,
                payload.error,
                'Invalid product payload',
                payload.error.status
            );
        }

        const previousDocumentation = product.documentation;
        const previousImage = product.image;

        applyProductUpdates(product, payload.value, req);

        await product.save();
        await populateManufacturer(product);

        if (payload.value.documentationFile && previousDocumentation) {
            removeStoredFile(previousDocumentation);
        }

        if (payload.value.imageFile && previousImage) {
            removeStoredFile(previousImage);
        }

        return res.status(200).json({
            message: 'Product updated successfully',
            product: serializeProduct(product),
        });
    } catch (error) {
        return sendCleanupError(res, req.files, error, 'Failed to update product');
    }
}

async function deleteProduct(req, res) {
    try {
        const product = req.product;
        if (!product) {
            return sendError(
                res,
                buildValidationError('Owned product is missing from request context', 500),
                'Owned product is missing from request context',
                500
            );
        }

        const documentationPath = product.documentation;
        const imagePath = product.image;

        await Product.deleteOne({ _id: product._id });

        if (documentationPath) {
            removeStoredFile(documentationPath);
        }

        if (imagePath) {
            removeStoredFile(imagePath);
        }

        return res.status(200).json({
            message: 'Product deleted successfully',
            product: {
                id: product.id || String(product._id),
                name: product.name || '',
            },
        });
    } catch (error) {
        return sendError(res, error, 'Failed to delete product');
    }
}

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    getProductDocument,
    getProductsByManufacturer,
    updateProduct,
    deleteProduct,
};
