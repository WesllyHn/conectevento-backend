const reviewService = require('../services/review.service');
const { successResponse } = require('../middleware/responseHandler');

class ReviewController {

  async getReviews(req, res, next) {
    try {
      const  id  = req.params.id
      const filters = {
        type: req.query.type,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };
      
      const result = await reviewService.getReview(id, filters);
      successResponse(res, result.reviews, 'Review retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createReview(req, res, next) {
    try {
      const reviewData = req.body;
      const newReview = await reviewService.create(reviewData);
      successResponse(res, newReview, 'Review created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateReview(req, res, next) {
    try {
      const { id } = req.params;
      const reviewData = req.body;
      const updatedReview = await reviewService.update(id, reviewData);
      successResponse(res, updatedReview, 'Review updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteReview(req, res, next) {
    try {
      const { id } = req.params;
      await reviewService.delete(id);
      successResponse(res, null, 'Review deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAvaliable(req, res, next) {
    try {
      const { id } = req.params.id
      const result = await reviewService.getAvaliable(id);
      successResponse(res, result.fornecedores, 'Review retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // async responseReview(req, res, next) {
  //   try {
  //     const { id } = req.params;
  //     const reviewData = req.body;
  
  //     const updatedResponse = await reviewService.updateResponseReview(id, reviewData);
  //     successResponse(res, updatedResponse, 'Review status updated successfully');
  //   } catch (error) {
  //     next(error);
  //   }
  // }
}

module.exports = new ReviewController();