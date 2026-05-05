const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: {
            type: String,
            required: function requiredPassword() {
                return !this.googleAuth;
            },
        },
        googleAuth: { type: Boolean, default: false },
        googleId: { type: String, default: '' },
        role: {
            type: String,
            required: true,
            enum: ['expert', 'artisan', 'manufacturer', 'admin'],
        },
        patent: {
            type: String,
            required: function requiredPatent() {
                return this.role === 'manufacturer';
            },
            trim: true,
        },
        address: {
            type: String,
            required: function requiredAddress() {
                return this.role === 'manufacturer';
            },
            trim: true,
        },
        companyPhone: {
            type: String,
            required: function requiredCompanyPhone() {
                return this.role === 'manufacturer';
            },
            trim: true,
        },
        profileImage: {
            type: String,
            default: '',
        },
        faceDescriptor: {
            type: [Number],
            default: undefined,
            select: false,
            validate: {
                validator(value) {
                    if (typeof value === 'undefined') return true;
                    return (
                        Array.isArray(value) &&
                        value.length === 128 &&
                        value.every((item) => Number.isFinite(Number(item)))
                    );
                },
                message: 'faceDescriptor must be a 128-value numeric vector',
            },
        },
        trade: {
            type: String,
            trim: true,
            lowercase: true,
            default: '',
        },
        job: {
            type: String,
            trim: true,
            default: '',
        },
        isPremium: {
            type: Boolean,
            default: false,
        },
        subscriptionType: {
            type: String,
            enum: ['monthly', 'yearly', null],
            default: null,
        },
        stripeCustomerId: {
            type: String,
            default: '',
            trim: true,
        },
        stripeSubscriptionId: {
            type: String,
            default: '',
            trim: true,
        },
        isBanned: {
            type: Boolean,
            default: false,
        },
        banType: {
            type: String,
            enum: ['temporary', 'permanent'],
            default: undefined,
        },
        banExpiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
