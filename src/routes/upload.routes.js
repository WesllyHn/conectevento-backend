const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticateToken } = require('../middleware/auth.middleware');


router.get('/supplier/:supplierId', uploadController.getImagesBySupplier);
router.get('/:portfolioId', uploadController.getImage);

router.post('/:supplierId', authenticateToken, uploadController.uploadImageBase64);
router.delete('/:portfolioId', authenticateToken, uploadController.deleteImage);

module.exports = router;