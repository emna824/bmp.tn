const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        role: {
            type: String,
            required: true,
            enum: ['expert', 'artisan', 'manufacturer'],
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
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
