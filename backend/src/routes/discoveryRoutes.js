const express = require('express');
const discoveryController = require('../controllers/discoveryController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/search', verifyToken, discoveryController.search);
router.get('/suggestions', verifyToken, discoveryController.getSuggestions);
router.get('/skills', verifyToken, discoveryController.getSkills);
router.get('/', verifyToken, discoveryController.discover);

module.exports = router;
