const express = require('express');
const documentController = require('../controllers/documentController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', documentController.listDocuments);
router.post('/', verifyToken, documentController.createDocument);
router.get('/:id', documentController.getDocument);
router.put('/:id', verifyToken, documentController.updateDocument);

module.exports = router;
