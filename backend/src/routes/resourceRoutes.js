const express = require('express');
const resourceController = require('../controllers/resourceController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', resourceController.listResources);
router.post('/', verifyToken, resourceController.createResource);
router.get('/:id', resourceController.getResource);
router.post('/:id/favorite', verifyToken, resourceController.favoriteResource);
router.delete('/:id/favorite', verifyToken, resourceController.unfavoriteResource);

module.exports = router;
