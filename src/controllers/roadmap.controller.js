const roadmapService = require('../services/roadmap.service');
const { successResponse } = require('../middleware/responseHandler');

class RoadmapController {

  async getRoadmap(req, res, next) {
    try {
      const id = req.params.id
      const result = await roadmapService.getRoadmap(id);
      successResponse(res, result, 'Roadmap retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  async get(req, res, next) {
    try {
      const id = req.params.idEvent
      const filters = {
        type: req.query.type,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };

      const result = await roadmapService.get(id, filters);
      successResponse(res, result, 'Roadmap retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const body = req.body;
      const createBody = await roadmapService.create(body);
      successResponse(res, createBody, 'Roadmap created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const updateBody = await roadmapService.update(id, body);
      successResponse(res, updateBody, 'Roadmap updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await roadmapService.delete(id);
      successResponse(res, null, 'Roadmap deleted successfully');
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new RoadmapController();