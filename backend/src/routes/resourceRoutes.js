const express = require('express');
const resourceController = require('../controllers/resourceController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', resourceController.listResources);
router.post('/', verifyToken, resourceController.createResource);
router.get('/:id', resourceController.getResource);
router.post('/:id/favorite', verifyToken, resourceController.favoriteResource);
router.delete('/:id/favorite', verifyToken, resourceController.unfavoriteResource);
router.post('/:id/payment/order', verifyToken, resourceController.createPaymentOrder);
router.post('/:id/payment/verify', verifyToken, resourceController.verifyPayment);

module.exports = router;
