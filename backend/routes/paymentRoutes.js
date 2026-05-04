const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
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

const PREMIUM_SUBSCRIPTION_CHECKOUT_ENABLED =
    String(process.env.PREMIUM_SUBSCRIPTION_CHECKOUT_ENABLED || 'true').trim().toLowerCase() !== 'false';

function logPaymentDebug(message, meta = {}) {
    console.log(`[payments] ${message}`, meta);
}

function logPaymentError(message, error, meta = {}) {
    console.error(`[payments] ${message}`, {
        ...meta,
        message: error?.message || error,
        stack: error?.stack,
    });
}

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

function getSessionSubscriptionId(session) {
    return normalizeStripeId(session?.subscription);
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

function isPremiumStripeStatus(status) {
    return ['active', 'trialing'].includes(String(status || '').trim().toLowerCase());
}

function isRecoverableStripeStatus(status) {
    return ['active', 'trialing', 'past_due', 'unpaid'].includes(
        String(status || '').trim().toLowerCase()
    );
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

async function fetchStripeSubscription(subscriptionId) {
    if (!subscriptionId) {
        return null;
    }

    const { stripeResponse, stripeData } = await fetchStripeJson(
        `subscriptions/${encodeURIComponent(subscriptionId)}`
    );

    if (!stripeResponse.ok) {
        logPaymentDebug('Stripe subscription lookup failed', {
            subscriptionId,
            status: stripeResponse.status,
            stripeError: stripeData?.error?.message,
        });
        return null;
    }

    return stripeData;
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
        isRecoverableStripeStatus(subscription?.status)
    );

    if (!activeSubscription) {
        return null;
    }

    return {
        stripeCustomerId: customerId,
        stripeSubscriptionId: normalizeStripeId(activeSubscription),
        subscriptionType: inferSubscriptionTypeFromStripe(activeSubscription),
        isPremium: isPremiumStripeStatus(activeSubscription?.status),
    };
}

function updateUserPremiumFields(user, { isPremium, subscriptionType, stripeCustomerId, stripeSubscriptionId }) {
    if (!user || user.role !== 'artisan') {
        return;
    }

    user.isPremium = Boolean(isPremium);
    user.subscriptionType = isPremium ? subscriptionType || user.subscriptionType || 'monthly' : null;
    user.stripeCustomerId = stripeCustomerId || user.stripeCustomerId || '';
    user.stripeSubscriptionId = isPremium ? stripeSubscriptionId || user.stripeSubscriptionId || '' : '';
}

async function syncUserFromStripeSubscription(subscription, options = {}) {
    const allowNewSubscription =
        options.allowNewSubscription ?? PREMIUM_SUBSCRIPTION_CHECKOUT_ENABLED;
    const subscriptionId = normalizeStripeId(subscription);
    const customerId = normalizeStripeId(subscription?.customer);
    const buyerId = String(subscription?.metadata?.buyerId || '').trim();

    const query = buyerId && isValidObjectId(buyerId)
        ? { _id: buyerId }
        : subscriptionId
            ? { stripeSubscriptionId: subscriptionId }
            : customerId
                ? { stripeCustomerId: customerId }
                : null;

    if (!query) {
        logPaymentDebug('Skipping subscription sync because no user lookup key was present', {
            subscriptionId,
            customerId,
        });
        return null;
    }

    const user = await User.findOne({ ...query, role: 'artisan' });
    if (!user) {
        logPaymentDebug('No artisan matched Stripe subscription sync query', {
            query,
            subscriptionId,
            customerId,
        });
        return null;
    }

    if (!allowNewSubscription) {
        const existingSubscriptionId = String(user.stripeSubscriptionId || '').trim();

        if (!existingSubscriptionId || existingSubscriptionId !== subscriptionId) {
            logPaymentDebug('Skipping unlinked Stripe subscription update', {
                userId: String(user._id),
                existingSubscriptionId,
                subscriptionId,
            });
            return null;
        }
    }

    updateUserPremiumFields(user, {
        isPremium: isPremiumStripeStatus(subscription?.status),
        subscriptionType: inferSubscriptionTypeFromStripe(subscription),
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
    });

    await user.save();
    logPaymentDebug('User premium state updated from Stripe subscription', {
        userId: String(user._id),
        isPremium: user.isPremium,
        subscriptionType: user.subscriptionType,
        stripeSubscriptionId: user.stripeSubscriptionId,
    });
    return user;
}

async function syncUserFromCheckoutSession(session) {
    const buyerId = String(session?.metadata?.buyerId || session?.client_reference_id || '').trim();
    const subscriptionId = getSessionSubscriptionId(session);
    let subscription = typeof session?.subscription === 'object' ? session.subscription : null;

    if (!subscription && subscriptionId) {
        subscription = await fetchStripeSubscription(subscriptionId);
    }

    if (subscription) {
        subscription.metadata = {
            ...(subscription.metadata || {}),
            ...(buyerId ? { buyerId } : {}),
            ...(session?.metadata?.subscriptionType ? { subscriptionType: session.metadata.subscriptionType } : {}),
        };
        return syncUserFromStripeSubscription(subscription, { allowNewSubscription: true });
    }

    if (!buyerId || !isValidObjectId(buyerId)) {
        logPaymentDebug('Checkout session completed without a usable buyer or subscription', {
            sessionId: normalizeStripeId(session),
            buyerId,
            subscriptionId,
        });
        return null;
    }

    const user = await User.findOne({ _id: buyerId, role: 'artisan' });
    if (!user) {
        logPaymentDebug('Checkout session buyer was not found', {
            sessionId: normalizeStripeId(session),
            buyerId,
            subscriptionId,
        });
        return null;
    }

    updateUserPremiumFields(user, {
        isPremium: true,
        subscriptionType: session?.metadata?.subscriptionType === 'yearly' ? 'yearly' : 'monthly',
        stripeCustomerId: normalizeStripeId(session?.customer),
        stripeSubscriptionId: subscriptionId,
    });
    await user.save();
    logPaymentDebug('User premium state updated from checkout session fallback', {
        userId: String(user._id),
        stripeSubscriptionId: user.stripeSubscriptionId,
        subscriptionType: user.subscriptionType,
    });

    return user;
}

async function syncUserPremiumFromStripe(user) {
    if (!user || user.role !== 'artisan') {
        return user;
    }

    const subscriptionId = String(user.stripeSubscriptionId || '').trim();

    if (subscriptionId) {
        const { stripeResponse, stripeData } = await fetchStripeJson(
            `subscriptions/${encodeURIComponent(subscriptionId)}`
        );

        if (stripeResponse.ok) {
            updateUserPremiumFields(user, {
                isPremium: isPremiumStripeStatus(stripeData?.status),
                subscriptionType: inferSubscriptionTypeFromStripe(stripeData),
                stripeCustomerId: normalizeStripeId(stripeData?.customer),
                stripeSubscriptionId: normalizeStripeId(stripeData),
            });
            await user.save();
            return user;
        }
    }

    if (!PREMIUM_SUBSCRIPTION_CHECKOUT_ENABLED) {
        return user;
    }

    const recoveredSubscription = await findRecoverableSubscription(user);
    if (recoveredSubscription?.stripeSubscriptionId) {
        updateUserPremiumFields(user, {
            isPremium: recoveredSubscription.isPremium,
            subscriptionType: recoveredSubscription.subscriptionType,
            stripeCustomerId: recoveredSubscription.stripeCustomerId,
            stripeSubscriptionId: recoveredSubscription.stripeSubscriptionId,
        });
        await user.save();
    }

    return user;
}

function verifyStripeWebhookSignature(rawBody, signatureHeader) {
    const endpointSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!endpointSecret) {
        throw new Error('Stripe webhook secret is not configured');
    }

    const timestampMatch = String(signatureHeader || '').match(/(?:^|,)t=([^,]+)/);
    const signatures = String(signatureHeader || '')
        .split(',')
        .filter((part) => part.startsWith('v1='))
        .map((part) => part.slice(3));

    if (!timestampMatch?.[1] || !signatures.length) {
        throw new Error('Invalid Stripe webhook signature header');
    }

    const signedPayload = `${timestampMatch[1]}.${rawBody.toString('utf8')}`;
    const expectedSignature = crypto
        .createHmac('sha256', endpointSecret)
        .update(signedPayload)
        .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const isValid = signatures.some((signature) => {
        try {
            const signatureBuffer = Buffer.from(signature, 'hex');
            return (
                signatureBuffer.length === expectedBuffer.length &&
                crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
            );
        } catch (error) {
            return false;
        }
    });

    if (!isValid) {
        throw new Error('Invalid Stripe webhook signature');
    }
}

async function handleStripeWebhook(req, res) {
    try {
        logPaymentDebug('Stripe webhook triggered', {
            hasSignature: Boolean(req.headers['stripe-signature']),
            bodyIsBuffer: Buffer.isBuffer(req.body),
        });

        if (!process.env.STRIPE_SECRET_KEY) {
            logPaymentDebug('Webhook rejected because STRIPE_SECRET_KEY is missing');
            return res.status(500).json({ message: 'Stripe is not configured on the backend' });
        }

        verifyStripeWebhookSignature(req.body, req.headers['stripe-signature']);

        const event = JSON.parse(req.body.toString('utf8'));
        const eventType = String(event?.type || '').trim();
        const object = event?.data?.object;
        logPaymentDebug('Stripe webhook event received', {
            eventId: event?.id,
            eventType,
            objectId: normalizeStripeId(object),
        });

        if (eventType === 'checkout.session.completed' && object?.mode === 'subscription') {
            const sessionId = normalizeStripeId(object);
            const { stripeResponse, stripeData } = await fetchStripeJson(
                `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`
            );

            if (!stripeResponse.ok) {
                logPaymentDebug('Could not expand checkout session from webhook', {
                    sessionId,
                    status: stripeResponse.status,
                    stripeError: stripeData?.error?.message,
                });
                await syncUserFromCheckoutSession(object);
            } else {
                await syncUserFromCheckoutSession(stripeData);
            }
        }

        if (
            eventType === 'customer.subscription.created' ||
            eventType === 'customer.subscription.updated' ||
            eventType === 'customer.subscription.deleted'
        ) {
            await syncUserFromStripeSubscription(object);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        logPaymentError('Stripe webhook failed', error);
        return res.status(400).json({ message: error.message || 'Invalid Stripe webhook' });
    }
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
        logPaymentDebug('Premium checkout requested', {
            userId: req.user?._id ? String(req.user._id) : null,
            role: req.user?.role,
            subscriptionType: req.body?.subscriptionType,
            origin: req.get('origin') || '',
        });

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe is not configured on the backend' });
        }

        if (!PREMIUM_SUBSCRIPTION_CHECKOUT_ENABLED) {
            return res.status(503).json({ message: 'Premium subscription checkout is currently disabled.' });
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
        logPaymentDebug('Premium checkout URLs resolved', {
            userId: String(req.user._id),
            successUrl,
            cancelUrl,
            currency,
            unitAmount,
        });

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
            logPaymentDebug('Stripe premium checkout session creation failed', {
                userId: String(req.user._id),
                status: stripeResponse.status,
                stripeError: stripeData?.error?.message,
            });
            return res.status(stripeResponse.status).json({
                message:
                    stripeData?.error?.message ||
                    'Stripe could not create a premium subscription checkout session',
            });
        }

        logPaymentDebug('Stripe premium checkout session created', {
            userId: String(req.user._id),
            sessionId: stripeData.id,
            subscriptionType,
            checkoutUrl: stripeData.url,
        });

        return res.status(200).json({
            sessionId: stripeData.id,
            url: stripeData.url,
            subscriptionType,
        });
    } catch (error) {
        logPaymentError('Failed to create premium checkout session', error, {
            userId: req.user?._id ? String(req.user._id) : null,
        });
        return res.status(500).json({ message: error.message || 'Failed to create premium checkout session' });
    }
});

router.get('/subscription-status', loadRequestUser, async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe is not configured on the backend' });
        }

        if (req.user?.role !== 'artisan') {
            return res.status(403).json({ message: 'Only artisans can access subscription status' });
        }

        const premiumUser = await User.findById(req.user._id);
        if (!premiumUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await syncUserPremiumFromStripe(premiumUser);
        const notifications = await unreadCount(premiumUser._id);

        return res.status(200).json({
            user: serializeUser(premiumUser, notifications),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Failed to sync subscription status' });
    }
});

router.post('/confirm-premium', loadRequestUser, async (req, res) => {
    try {
        logPaymentDebug('Premium checkout confirmation requested', {
            userId: req.user?._id ? String(req.user._id) : null,
            sessionId: req.body?.sessionId,
        });

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ message: 'Stripe is not configured on the backend' });
        }

        if (!PREMIUM_SUBSCRIPTION_CHECKOUT_ENABLED) {
            return res.status(503).json({ message: 'Premium subscription checkout is currently disabled.' });
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
            logPaymentDebug('Stripe checkout confirmation lookup failed', {
                userId: String(req.user._id),
                sessionId,
                status: stripeResponse.status,
                stripeError: stripeData?.error?.message,
            });
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

        const isCompleted = String(stripeData?.status || '').trim().toLowerCase() === 'complete';
        const isActiveSubscription =
            isPremiumStripeStatus(stripeData?.subscription?.status) ||
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
        updateUserPremiumFields(premiumUser, {
            isPremium: true,
            subscriptionType: subscriptionType === 'yearly' ? 'yearly' : 'monthly',
            stripeSubscriptionId,
            stripeCustomerId,
        });
        await premiumUser.save();
        logPaymentDebug('User premium state updated from checkout confirmation', {
            userId: String(premiumUser._id),
            subscriptionType: premiumUser.subscriptionType,
            stripeSubscriptionId: premiumUser.stripeSubscriptionId,
            stripeCustomerId: premiumUser.stripeCustomerId,
        });

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
        logPaymentError('Failed to confirm premium subscription', error, {
            userId: req.user?._id ? String(req.user._id) : null,
        });
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

        updateUserPremiumFields(premiumUser, {
            isPremium: false,
            stripeCustomerId,
        });
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
module.exports.handleStripeWebhook = handleStripeWebhook;
