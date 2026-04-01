const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const loadRequestUser = require('../middleware/loadRequestUser');

const router = express.Router();

const ZERO_DECIMAL_CURRENCIES = new Set([
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
]);

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function normalizeQuantity(value) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return Math.min(parsed, 99);
}

function toMinorUnitAmount(amount, currency) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return null;
    }

    if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
        return Math.round(numericAmount);
    }

    return Math.round(numericAmount * 100);
}

function getFrontendBaseUrl(req) {
    const configuredBaseUrl = String(process.env.CHECKOUT_BASE_URL || '').trim();
    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/+$/, '');
    }

    const requestOrigin = String(req.get('origin') || '').trim();
    if (requestOrigin) {
        return requestOrigin.replace(/\/+$/, '');
    }

    const firstAllowedOrigin = String(process.env.CORS_ORIGINS || 'http://localhost:5173')
        .split(',')[0]
        .trim();

    return firstAllowedOrigin.replace(/\/+$/, '');
}

function getCheckoutCurrency() {
    return String(process.env.STRIPE_DEFAULT_CURRENCY || 'usd').trim().toLowerCase();
}

function isSupportedCheckoutCurrency(currency) {
    return /^[a-z]{3}$/.test(currency) && currency !== 'tnd';
}

router.post('/checkout-session', loadRequestUser, async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe is not configured on the backend' });
        }

        if (!req.user?._id) {
            return res.status(401).json({ message: 'You must be signed in to start checkout' });
        }

        const productId = String(req.body?.productId || '').trim();
        const quantity = normalizeQuantity(req.body?.quantity);

        if (!productId || !isValidObjectId(productId)) {
            return res.status(400).json({ message: 'Valid productId is required' });
        }

        if (!quantity) {
            return res.status(400).json({ message: 'quantity must be a positive integer' });
        }

        const product = await Product.findById(productId).populate(
            'manufacturerId',
            'name email companyPhone'
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const hasTrackedStock = Number.isInteger(product.stock);
        const availableStock = hasTrackedStock ? product.stock : 99;
        if (hasTrackedStock && availableStock <= 0) {
            return res.status(400).json({ message: 'This product is currently out of stock' });
        }

        if (hasTrackedStock && quantity > availableStock) {
            return res.status(400).json({
                message: `Only ${availableStock} item${availableStock === 1 ? '' : 's'} currently in stock`,
            });
        }

        if (!Number.isFinite(product.price) || product.price <= 0) {
            return res.status(400).json({ message: 'This product is not available for payment yet' });
        }

        const currency = getCheckoutCurrency();
        if (!isSupportedCheckoutCurrency(currency)) {
            return res.status(500).json({
                message:
                    'Stripe checkout currency is not configured correctly. Set STRIPE_DEFAULT_CURRENCY to a Stripe-supported 3-letter code such as USD or EUR.',
            });
        }

        const unitAmount = toMinorUnitAmount(product.price, currency);
        if (!unitAmount || unitAmount <= 0) {
            return res.status(400).json({ message: 'Product price is invalid for checkout' });
        }

        const frontendBaseUrl = getFrontendBaseUrl(req);
        const successUrl = `${frontendBaseUrl}/?payment=success&view=marketplace&productId=${productId}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${frontendBaseUrl}/?payment=cancelled&view=marketplace&productId=${productId}`;

        const params = new URLSearchParams();
        params.set('mode', 'payment');
        params.set('success_url', successUrl);
        params.set('cancel_url', cancelUrl);
        params.set('line_items[0][quantity]', String(quantity));
        params.set('line_items[0][price_data][currency]', currency);
        params.set('line_items[0][price_data][unit_amount]', String(unitAmount));
        params.set('line_items[0][price_data][product_data][name]', product.name);
        params.set(
            'line_items[0][price_data][product_data][description]',
            product.description || `Sold by ${product.manufacturerId?.name || 'manufacturer'}`
        );
        params.set('metadata[buyerId]', String(req.user._id));
        params.set('metadata[productId]', String(product._id));
        params.set('metadata[quantity]', String(quantity));
        params.set('metadata[currency]', currency);
        params.set('client_reference_id', String(req.user._id));

        const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        const stripeData = await stripeResponse.json();

        if (!stripeResponse.ok) {
            return res.status(stripeResponse.status).json({
                message:
                    stripeData?.error?.message ||
                    'Stripe could not create a checkout session for this product',
            });
        }

        return res.status(200).json({
            sessionId: stripeData.id,
            url: stripeData.url,
            product: {
                id: String(product._id),
                name: product.name,
                quantity,
                stock: hasTrackedStock ? availableStock : null,
                unitPrice: product.price,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to create checkout session' });
    }
});

module.exports = router;
