// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');

router.get('/:id', reviewController.getReviews);
router.get('/organizadorId/:id', reviewController.getAvaliable)
router.post('/', reviewController.createReview);
router.put('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);


module.exports = router;