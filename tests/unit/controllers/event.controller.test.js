const eventController = require('../../../src/controllers/event.controller');
const eventService = require('../../../src/services/event.service');
const { successResponse } = require('../../../src/middleware/responseHandler');

jest.mock('../../../src/services/event.service');
jest.mock('../../../src/middleware/responseHandler');

describe('EventController', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getEvents', () => {
    test('deve buscar eventos com filtros', async () => {
      const mockResult = {
        events: [{ id: '1', title: 'Wedding' }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      };

      req.query = { type: 'WEDDING', status: 'PLANNING', page: '1', limit: '10' };
      eventService.getAllEvents.mockResolvedValue(mockResult);

      await eventController.getEvents(req, res, next);

      expect(eventService.getAllEvents).toHaveBeenCalledWith({
        type: 'WEDDING',
        status: 'PLANNING',
        organizerId: undefined,
        page: '1',
        limit: '10'
      });
      expect(successResponse).toHaveBeenCalledWith(res, mockResult.events, 'Events retrieved successfully');
    });

    test('deve usar valores padrão de paginação', async () => {
      const mockResult = { events: [], pagination: {} };
      req.query = {};
      eventService.getAllEvents.mockResolvedValue(mockResult);

      await eventController.getEvents(req, res, next);

      expect(eventService.getAllEvents).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 })
      );
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      eventService.getAllEvents.mockRejectedValue(error);

      await eventController.getEvents(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getEventById', () => {
    test('deve buscar evento por ID', async () => {
      const mockEvent = { id: 'event1', title: 'Wedding' };
      req.params = { id: 'event1' };
      eventService.getEventById.mockResolvedValue(mockEvent);

      await eventController.getEventById(req, res, next);

      expect(eventService.getEventById).toHaveBeenCalledWith('event1');
      expect(successResponse).toHaveBeenCalledWith(res, mockEvent, 'Event retrieved successfully');
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Not found');
      req.params = { id: 'invalid' };
      eventService.getEventById.mockRejectedValue(error);

      await eventController.getEventById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createEvent', () => {
    test('deve criar evento', async () => {
      const mockData = { title: 'Wedding', type: 'WEDDING' };
      const mockCreated = { id: 'event1', ...mockData };
      req.body = mockData;
      eventService.createEvent.mockResolvedValue(mockCreated);

      await eventController.createEvent(req, res, next);

      expect(eventService.createEvent).toHaveBeenCalledWith(mockData);
      expect(successResponse).toHaveBeenCalledWith(res, mockCreated, 'Event created successfully', 201);
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      eventService.createEvent.mockRejectedValue(error);

      await eventController.createEvent(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateEvent', () => {
    test('deve atualizar evento', async () => {
      const mockUpdated = { id: 'event1', title: 'Updated' };
      req.params = { id: 'event1' };
      req.body = { title: 'Updated' };
      eventService.updateEvent.mockResolvedValue(mockUpdated);

      await eventController.updateEvent(req, res, next);

      expect(eventService.updateEvent).toHaveBeenCalledWith('event1', { title: 'Updated' });
      expect(successResponse).toHaveBeenCalledWith(res, mockUpdated, 'Event updated successfully');
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.params = { id: 'event1' };
      eventService.updateEvent.mockRejectedValue(error);

      await eventController.updateEvent(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteEvent', () => {
    test('deve deletar evento', async () => {
      req.params = { id: 'event1' };
      eventService.deleteEvent.mockResolvedValue({});

      await eventController.deleteEvent(req, res, next);

      expect(eventService.deleteEvent).toHaveBeenCalledWith('event1');
      expect(successResponse).toHaveBeenCalledWith(res, null, 'Event deleted successfully');
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.params = { id: 'event1' };
      eventService.deleteEvent.mockRejectedValue(error);

      await eventController.deleteEvent(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateEventStatus', () => {
    test('deve atualizar status', async () => {
      const mockUpdated = { id: 'event1', status: 'CONFIRMED' };
      req.params = { id: 'event1' };
      req.body = { status: 'CONFIRMED' };
      eventService.updateEventStatus.mockResolvedValue(mockUpdated);

      await eventController.updateEventStatus(req, res, next);

      expect(eventService.updateEventStatus).toHaveBeenCalledWith('event1', 'CONFIRMED');
      expect(successResponse).toHaveBeenCalledWith(res, mockUpdated, 'Event status updated successfully');
    });

    test('deve retornar erro quando status não fornecido', async () => {
      req.params = { id: 'event1' };
      req.body = {};

      await eventController.updateEventStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Status is required' }));
    });
  });

  describe('getEventsByOrganizer', () => {
    test('deve buscar eventos por organizerId', async () => {
      const mockResult = { events: [{ id: '1' }], pagination: {} };
      req.params = { organizerId: 'org1' };
      req.query = { page: '1', limit: '10' };
      eventService.getEventsByOrganizer.mockResolvedValue(mockResult);

      await eventController.getEventsByOrganizer(req, res, next);

      expect(eventService.getEventsByOrganizer).toHaveBeenCalledWith('org1', expect.any(Object));
      expect(successResponse).toHaveBeenCalledWith(res, mockResult.events, 'Organizer events retrieved successfully');
    });
  });

  describe('getEventsByType', () => {
    test('deve buscar eventos por type', async () => {
      const mockResult = { events: [{ id: '1' }], pagination: {} };
      req.params = { type: 'WEDDING' };
      eventService.getEventsByType.mockResolvedValue(mockResult);

      await eventController.getEventsByType(req, res, next);

      expect(eventService.getEventsByType).toHaveBeenCalledWith('WEDDING', expect.any(Object));
      expect(successResponse).toHaveBeenCalledWith(res, mockResult, 'Events by type retrieved successfully');
    });
  });
});