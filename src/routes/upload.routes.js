const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');

router.post('/:supplierId', uploadController.uploadImageBase64);
router.get('/supplier/:supplierId', uploadController.getImagesBySupplier);
router.get('/:portfolioId', uploadController.getImage);

module.exports = router;
