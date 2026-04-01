const express = require('express');

const router = express.Router();

router.use('/products', (_req, res) => {
    return res.status(410).json({
        message: 'Legacy manufacturer product routes were removed. Use /api/products instead.',
    });
});

module.exports = router;
