const eventService = require('../services/event.service');
const { successResponse } = require('../middleware/responseHandler');
const AppError = require('../utils/AppError');

class EventController {
  async getEvents(req, res, next) {
    try {
      const filters = {
        type: req.query.type,
        status: req.query.status,
        organizerId: req.query.organizerId,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };
      
      const result = await eventService.getAllEvents(filters);
      successResponse(res, result.events, 'Events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req, res, next) {
    try {
      const { id } = req.params;
      const event = await eventService.getEventById(id);
      successResponse(res, event, 'Event retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createEvent(req, res, next) {
    try {
      const eventData = req.body;
      const newEvent = await eventService.createEvent(eventData);
      successResponse(res, newEvent, 'Event created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      const eventData = req.body;
      const updatedEvent = await eventService.updateEvent(id, eventData);
      successResponse(res, updatedEvent, 'Event updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const { id } = req.params;
      await eventService.deleteEvent(id);
      successResponse(res, null, 'Event deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateEventStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return next(new AppError('Status is required', 400));
      }
      
      const updatedEvent = await eventService.updateEventStatus(id, status);
      successResponse(res, updatedEvent, 'Event status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEventsByOrganizer(req, res, next) {
    try {
      const { organizerId } = req.params;
      const filters = {
        status: req.query.status,
        type: req.query.type,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };
      
      const result = await eventService.getEventsByOrganizer(organizerId, filters);
      successResponse(res, result.events, 'Organizer events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEventsByType(req, res, next) {
    try {
      const { type } = req.params;
      const filters = {
        status: req.query.status,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };
      
      const result = await eventService.getEventsByType(type, filters);
      successResponse(res, result, 'Events by type retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventController();