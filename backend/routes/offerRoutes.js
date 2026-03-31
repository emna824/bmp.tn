const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const applicationController = require('../controllers/applicationController');

router.get('/', offerController.listOffers);
router.get('/:offerId', offerController.getOfferById);
router.post('/:offerId/apply', applicationController.applyToOffer);

module.exports = router;
