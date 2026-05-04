const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/product');
const User = require('../models/user');
const Notification = require('../models/notification');
const loadRequestUser = require('../middleware/loadRequestUser');
const { serializeUser } = require('../controllers/userController');
const { logAction } = require('../utils/logAction');

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

const PREMIUM_PLANS = {
    monthly: {
        label: 'BMP.tn Premium Monthly',
        description: 'Monthly premium access for project creation and calendar planning.',
        amount: 1.99,
        interval: 'month',
    },
    yearly: {
        label: 'BMP.tn Premium Yearly',
        description: 'Yearly premium access for project creation and calendar planning.',
        amount: 20,
        interval: 'year',
    },
};

async function unreadCount(userId) {
    try {
        return await Notification.countDocuments({ userId, isRead: false });
    } catch (error) {
        return 0;
    }
}

function normalizeStripeId(value) {
    return typeof value === 'string' ? value.trim() : value?.id ? String(value.id).trim() : '';
}

function inferSubscriptionTypeFromStripe(subscription) {
    const interval = String(
        subscription?.items?.data?.[0]?.price?.recurring?.interval ||
            subscription?.items?.data?.[0]?.plan?.interval ||
            ''
    )
        .trim()
        .toLowerCase();

    if (interval === 'year') {
        return 'yearly';
    }

    return interval === 'month' ? 'monthly' : null;
}

async function fetchStripeJson(path, options = {}) {
    const stripeResponse = await fetch(`https://api.stripe.com/v1/${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            ...(options.headers || {}),
        },
    });

    const stripeData = await stripeResponse.json();

    return { stripeResponse, stripeData };
}

async function findStripeCustomerIdByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
        return '';
    }

    const { stripeResponse, stripeData } = await fetchStripeJson(
        `customers?email=${encodeURIComponent(normalizedEmail)}&limit=10`
    );

    if (!stripeResponse.ok || !Array.isArray(stripeData?.data)) {
        return '';
    }

    const matchingCustomer = stripeData.data.find(
        (customer) => String(customer?.email || '').trim().toLowerCase() === normalizedEmail
    );

    return normalizeStripeId(matchingCustomer);
}

async function findRecoverableSubscription(user) {
    const knownCustomerId = String(user?.stripeCustomerId || '').trim();
    const customerId = knownCustomerId || (await findStripeCustomerIdByEmail(user?.email));

    if (!customerId) {
        return null;
    }

    const { stripeResponse, stripeData } = await fetchStripeJson(
        `subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=10`
    );

    if (!stripeResponse.ok || !Array.isArray(stripeData?.data)) {
        return null;
    }

    const activeSubscription = stripeData.data.find((subscription) =>
        ['active', 'trialing', 'past_due', 'unpaid'].includes(
            String(subscription?.status || '').trim().toLowerCase()
        )
    );

    if (!activeSubscription) {
        return null;
    }

    return {
        stripeCustomerId: customerId,
        stripeSubscriptionId: normalizeStripeId(activeSubscription),
        subscriptionType: inferSubscriptionTypeFromStripe(activeSubscription),
    };
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

router.post('/premium-session', loadRequestUser, async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe is not configured on the backend' });
        }

        if (req.user?.role !== 'artisan') {
            return res.status(403).json({ message: 'Only artisans can subscribe to premium' });
        }

        const subscriptionType = String(req.body?.subscriptionType || '').trim().toLowerCase();
        const selectedPlan = PREMIUM_PLANS[subscriptionType];

        if (!selectedPlan) {
            return res.status(400).json({ message: 'subscriptionType must be monthly or yearly' });
        }

        const currency = getCheckoutCurrency();
        if (!isSupportedCheckoutCurrency(currency)) {
            return res.status(500).json({
                message:
                    'Stripe checkout currency is not configured correctly. Set STRIPE_DEFAULT_CURRENCY to a Stripe-supported 3-letter code such as USD or EUR.',
            });
        }

        const unitAmount = toMinorUnitAmount(selectedPlan.amount, currency);
        if (!unitAmount || unitAmount <= 0) {
            return res.status(400).json({ message: 'Premium plan price is invalid for checkout' });
        }

        const frontendBaseUrl = getFrontendBaseUrl(req);
        const successUrl = `${frontendBaseUrl}/?subscription=success&subscriptionType=${subscriptionType}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${frontendBaseUrl}/?subscription=cancelled&subscriptionType=${subscriptionType}`;

        const params = new URLSearchParams();
        params.set('mode', 'subscription');
        params.set('success_url', successUrl);
        params.set('cancel_url', cancelUrl);
        params.set('line_items[0][quantity]', '1');
        params.set('line_items[0][price_data][currency]', currency);
        params.set('line_items[0][price_data][unit_amount]', String(unitAmount));
        params.set('line_items[0][price_data][product_data][name]', selectedPlan.label);
        params.set('line_items[0][price_data][product_data][description]', selectedPlan.description);
        params.set('line_items[0][price_data][recurring][interval]', selectedPlan.interval);
        if (req.user?.email) {
            params.set('customer_email', String(req.user.email).trim());
        }
        params.set('metadata[buyerId]', String(req.user._id));
        params.set('metadata[subscriptionType]', subscriptionType);
        params.set('subscription_data[metadata][buyerId]', String(req.user._id));
        params.set('subscription_data[metadata][subscriptionType]', subscriptionType);
        params.set('client_reference_id', String(req.user._id));

        const { stripeResponse, stripeData } = await fetchStripeJson('checkout/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        if (!stripeResponse.ok) {
            return res.status(stripeResponse.status).json({
                message:
                    stripeData?.error?.message ||
                    'Stripe could not create a premium subscription checkout session',
            });
        }

        return res.status(200).json({
            sessionId: stripeData.id,
            url: stripeData.url,
            subscriptionType,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to create premium checkout session' });
    }
});

router.post('/confirm-premium', loadRequestUser, async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe is not configured on the backend' });
        }

        if (req.user?.role !== 'artisan') {
            return res.status(403).json({ message: 'Only artisans can activate premium subscriptions' });
        }

        const sessionId = String(req.body?.sessionId || '').trim();
        if (!sessionId) {
            return res.status(400).json({ message: 'sessionId is required' });
        }

        const { stripeResponse, stripeData } = await fetchStripeJson(
            `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`
        );

        if (!stripeResponse.ok) {
            return res.status(stripeResponse.status).json({
                message: stripeData?.error?.message || 'Stripe could not confirm this subscription checkout',
            });
        }

        const buyerId = String(
            stripeData?.metadata?.buyerId || stripeData?.client_reference_id || ''
        ).trim();
        if (buyerId && buyerId !== String(req.user._id)) {
            return res.status(403).json({ message: 'This subscription session does not belong to the current user' });
        }

        const subscriptionStatus = String(stripeData?.subscription?.status || '').trim().toLowerCase();
        const isCompleted = String(stripeData?.status || '').trim().toLowerCase() === 'complete';
        const isActiveSubscription =
            ['active', 'trialing'].includes(subscriptionStatus) ||
            String(stripeData?.payment_status || '').trim().toLowerCase() === 'paid';

        if (!isCompleted || !isActiveSubscription) {
            return res.status(400).json({ message: 'Premium subscription payment is not complete yet' });
        }

        const premiumUser = await User.findById(req.user._id);
        if (!premiumUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const subscriptionType = String(stripeData?.metadata?.subscriptionType || '').trim().toLowerCase();
        const stripeSubscriptionId = normalizeStripeId(stripeData?.subscription);
        const stripeCustomerId =
            normalizeStripeId(stripeData?.customer) ||
            normalizeStripeId(stripeData?.subscription?.customer);
        premiumUser.isPremium = true;
        premiumUser.subscriptionType = subscriptionType === 'yearly' ? 'yearly' : 'monthly';
        premiumUser.stripeSubscriptionId = stripeSubscriptionId;
        premiumUser.stripeCustomerId = stripeCustomerId;
        await premiumUser.save();

        const notifications = await unreadCount(premiumUser._id);
        logAction({
            userId: premiumUser._id,
            action: 'subscription_payment',
            entityType: 'user',
            entityId: premiumUser._id,
            description: `Premium ${premiumUser.subscriptionType} subscription activated`,
        });

        return res.status(200).json({
            message: 'Premium subscription activated successfully',
            user: serializeUser(premiumUser, notifications),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to confirm premium subscription' });
    }
});

router.post('/cancel-premium', loadRequestUser, async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe is not configured on the backend' });
        }

        if (req.user?.role !== 'artisan') {
            return res.status(403).json({ message: 'Only artisans can cancel premium subscriptions' });
        }

        const premiumUser = await User.findById(req.user._id);
        if (!premiumUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!premiumUser.isPremium) {
            return res.status(400).json({ message: 'No active premium subscription to cancel' });
        }

        let subscriptionId = String(premiumUser.stripeSubscriptionId || '').trim();
        let stripeCustomerId = String(premiumUser.stripeCustomerId || '').trim();

        if (!subscriptionId) {
            const recoveredSubscription = await findRecoverableSubscription(premiumUser);
            if (recoveredSubscription?.stripeSubscriptionId) {
                subscriptionId = recoveredSubscription.stripeSubscriptionId;
                stripeCustomerId = recoveredSubscription.stripeCustomerId || stripeCustomerId;
                premiumUser.stripeSubscriptionId = subscriptionId;
                premiumUser.stripeCustomerId = stripeCustomerId;
                if (!premiumUser.subscriptionType && recoveredSubscription.subscriptionType) {
                    premiumUser.subscriptionType = recoveredSubscription.subscriptionType;
                }
                await premiumUser.save();
            }
        }

        if (!subscriptionId) {
            return res.status(400).json({
                message:
                    'We could not recover an active Stripe subscription for this premium account yet. Please contact support or resubscribe once so we can link it.',
            });
        }

        const { stripeResponse, stripeData } = await fetchStripeJson(
            `subscriptions/${encodeURIComponent(subscriptionId)}`,
            {
                method: 'DELETE',
            }
        );

        if (!stripeResponse.ok) {
            return res.status(stripeResponse.status).json({
                message: stripeData?.error?.message || 'Stripe could not cancel this subscription',
            });
        }

        premiumUser.isPremium = false;
        premiumUser.subscriptionType = null;
        premiumUser.stripeSubscriptionId = '';
        await premiumUser.save();

        const notifications = await unreadCount(premiumUser._id);

        return res.status(200).json({
            message: 'Premium subscription cancelled successfully',
            user: serializeUser(premiumUser, notifications),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to cancel premium subscription' });
    }
});

module.exports = router;
