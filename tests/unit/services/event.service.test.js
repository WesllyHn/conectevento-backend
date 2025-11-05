// tests/unit/services/event.service.test.js
const eventService = require('../../../src/services/event.service');
const roadmapService = require('../../../src/services/roadmap.service');
const { PrismaClient } = require('@prisma/client');
const AppError = require('../../../src/utils/AppError');

const prisma = new PrismaClient();
jest.mock('../../../src/services/roadmap.service');

describe('EventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllEvents', () => {
    test('deve buscar todos os eventos com paginação', async () => {
      const mockEvents = [
        { id: '1', title: 'Wedding', type: 'WEDDING', organizerId: 'org1' },
        { id: '2', title: 'Birthday', type: 'BIRTHDAY', organizerId: 'org2' }
      ];

      prisma.event.findMany.mockResolvedValue(mockEvents);
      prisma.event.count.mockResolvedValue(2);

      const result = await eventService.getAllEvents({ page: 1, limit: 10 });

      expect(result.events).toEqual(mockEvents);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    test('deve filtrar por type, status e organizerId', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);

      await eventService.getAllEvents({
        type: 'WEDDING',
        status: 'PLANNING',
        organizerId: 'org1',
        page: 1,
        limit: 10
      });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            type: 'WEDDING',
            status: 'PLANNING',
            organizerId: 'org1'
          }
        })
      );
    });

    test('deve lançar AppError quando ocorrer erro', async () => {
      prisma.event.findMany.mockRejectedValue(new Error('Database error'));

      await expect(eventService.getAllEvents({})).rejects.toThrow(AppError);
      await expect(eventService.getAllEvents({})).rejects.toThrow(/Error fetching events/);
    });
  });

  describe('getEventById', () => {
    test('deve buscar evento por ID', async () => {
      const mockEvent = { id: 'event1', title: 'Wedding', type: 'WEDDING' };
      prisma.event.findUnique.mockResolvedValue(mockEvent);

      const result = await eventService.getEventById('event1');

      expect(result).toEqual(mockEvent);
    });

    test('deve lançar AppError 404 quando evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(eventService.getEventById('invalid-id')).rejects.toThrow(AppError);
      await expect(eventService.getEventById('invalid-id')).rejects.toThrow('Event not found');
    });
  });

  describe('createEvent', () => {
    test('deve criar evento sem chamar createRoadmapEsp', async () => {
      const mockEventData = {
        title: 'Wedding',
        type: 'WEDDING',
        organizerId: 'org1',
        guestCount: 100
      };
      const mockCreated = { id: 'event1', ...mockEventData };

      prisma.event.create.mockResolvedValue(mockCreated);

      const result = await eventService.createEvent(mockEventData);

      expect(result).toEqual(mockCreated);
      expect(roadmapService.createRoadmapEsp).not.toHaveBeenCalled();
    });

    test('deve lançar AppError 404 quando organizer não existe (P2003)', async () => {
      prisma.event.create.mockRejectedValue({ code: 'P2003' });

      await expect(eventService.createEvent({})).rejects.toThrow('Organizer not found');
    });

    test('não deve chamar createRoadmapEsp se criação falhar', async () => {
      prisma.event.create.mockRejectedValue(new Error('Error'));

      await expect(eventService.createEvent({})).rejects.toThrow(AppError);
      expect(roadmapService.createRoadmapEsp).not.toHaveBeenCalled();
    });
  });

  describe('updateEvent', () => {
    test('deve atualizar evento existente', async () => {
      const mockExisting = { id: 'event1', title: 'Old' };
      const mockUpdated = { id: 'event1', title: 'New' };

      prisma.event.findUnique.mockResolvedValue(mockExisting);
      prisma.event.update.mockResolvedValue(mockUpdated);

      const result = await eventService.updateEvent('event1', { title: 'New' });

      expect(result).toEqual(mockUpdated);
    });

    test('deve lançar AppError 404 quando evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(eventService.updateEvent('invalid', {})).rejects.toThrow('Event not found');
    });
  });

  describe('deleteEvent', () => {
    test('deve deletar evento existente', async () => {
      const mockExisting = { id: 'event1' };
      prisma.event.findUnique.mockResolvedValue(mockExisting);
      prisma.event.delete.mockResolvedValue(mockExisting);

      const result = await eventService.deleteEvent('event1');

      expect(result).toEqual(mockExisting);
    });

    test('deve lançar AppError 404 quando evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(eventService.deleteEvent('invalid')).rejects.toThrow('Event not found');
    });
  });

  describe('updateEventStatus', () => {
    test('deve atualizar status com sucesso', async () => {
      prisma.event.findUnique.mockResolvedValue({ id: 'event1' });
      prisma.event.update.mockResolvedValue({ id: 'event1', status: 'CONFIRMED' });

      const result = await eventService.updateEventStatus('event1', 'CONFIRMED');

      expect(result.status).toBe('CONFIRMED');
    });

    test('deve validar status do enum EventStatus', async () => {
      const validStatuses = ['PLANNING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
      
      for (const status of validStatuses) {
        prisma.event.findUnique.mockResolvedValue({ id: 'event1' });
        prisma.event.update.mockResolvedValue({ id: 'event1', status });

        const result = await eventService.updateEventStatus('event1', status);
        expect(result.status).toBe(status);
      }
    });

    test('deve lançar AppError 400 para status inválido', async () => {
      prisma.event.findUnique.mockResolvedValue({ id: 'event1' });

      await expect(eventService.updateEventStatus('event1', 'INVALID')).rejects.toThrow('Invalid status value');
    });
  });

  describe('getEventsByOrganizer', () => {
    test('deve buscar eventos por organizerId', async () => {
      const mockEvents = [{ id: '1', organizerId: 'org1' }];
      prisma.event.findMany.mockResolvedValue(mockEvents);
      prisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEventsByOrganizer('org1', { page: 1, limit: 10 });

      expect(result.events).toEqual(mockEvents);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizerId: 'org1' })
        })
      );
    });
  });

  describe('getEventsByType', () => {
    test('deve buscar eventos por type', async () => {
      const mockEvents = [{ id: '1', type: 'WEDDING' }];
      prisma.event.findMany.mockResolvedValue(mockEvents);
      prisma.event.count.mockResolvedValue(1);

      const result = await eventService.getEventsByType('WEDDING', { page: 1, limit: 10 });

      expect(result.events).toEqual(mockEvents);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'WEDDING' })
        })
      );
    });
  });
});