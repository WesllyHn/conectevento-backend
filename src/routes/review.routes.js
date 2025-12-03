const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/:id', reviewController.getReviews);
router.get('/organizadorId/:id', reviewController.getAvaliable);

router.post('/', authenticateToken, reviewController.createReview);
router.put('/:id', authenticateToken, reviewController.updateReview);
router.delete('/:id', authenticateToken, reviewController.deleteReview);

module.exports = router;