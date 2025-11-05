const budgetService = require('../services/budget.service');
const { successResponse } = require('../middleware/responseHandler');

class BudgetController {

  async getBudget(req, res, next) {
    try {
      const { id } = req.params.id
      const filters = {
        type: req.query.type,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };
      
      const result = await budgetService.getBudget(id, filters);
      successResponse(res, result.response, 'Review retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  async budget(req, res, next) {
    try {
      const  id  = req.query.id

      const result = await budgetService.budget(id);
      successResponse(res, result, 'Review retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const body = req.body;
      const createBody = await budgetService.create(body);
      successResponse(res, createBody, 'Review created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const body = req.body;
      const updateBody = await budgetService.update(id, body);
      successResponse(res, updateBody, 'Review updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await budgetService.delete(id);
      successResponse(res, null, 'Review deleted successfully');
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new BudgetController();