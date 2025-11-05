// tests/integration/event.integration.test.js
const request = require('supertest');
const express = require('express');
const eventRoutes = require('../../src/routes/event.routes');
const errorHandler = require('../../src/middleware/errorHandler');
const { PrismaClient } = require('@prisma/client');
const roadmapService = require('../../src/services/roadmap.service');

const prisma = new PrismaClient();
jest.mock('../../src/services/roadmap.service');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/events', eventRoutes);
  app.use(errorHandler);
  return app;
};

describe('Event Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /api/events', () => {
    test('deve retornar eventos com paginação', async () => {
      const mockEvents = [
        { id: 'event1', title: 'Wedding', type: 'WEDDING', createdAt: new Date(), updatedAt: new Date() },
        { id: 'event2', title: 'Birthday', type: 'BIRTHDAY', createdAt: new Date(), updatedAt: new Date() }
      ];

      prisma.event.findMany.mockResolvedValue(mockEvents);
      prisma.event.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/events')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.message).toBe('Events retrieved successfully');
    });

    test('deve filtrar por type, status e organizerId', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);

      await request(app)
        .get('/api/events')
        .query({ type: 'WEDDING', status: 'PLANNING', organizerId: 'org1' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'WEDDING', status: 'PLANNING', organizerId: 'org1' }
        })
      );
    });

    test('deve retornar erro 500 quando ocorrer erro', async () => {
      prisma.event.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/events');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/events/:id', () => {
    test('deve retornar evento por ID', async () => {
      const mockEvent = {
        id: 'event1',
        title: 'Wedding',
        type: 'WEDDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.event.findUnique.mockResolvedValue(mockEvent);

      const response = await request(app).get('/api/events/event1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event retrieved successfully');
    });

    test('deve retornar erro 404 quando evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/events/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Event not found');
    });
  });

  describe('POST /api/events', () => {
    test('deve criar evento sem chamar createRoadmapEsp', async () => {
      const newEvent = {
        title: 'Wedding',
        type: 'WEDDING',
        date: '2025-12-31',
        location: 'São Paulo',
        budget: '10000',
        organizerId: 'org1',
        guestCount: 100
      };

      const mockCreated = {
        id: 'event1',
        ...newEvent,
        date: new Date(newEvent.date),
        status: 'PLANNING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.event.create.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/events')
        .send(newEvent);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event created successfully');
      expect(roadmapService.createRoadmapEsp).not.toHaveBeenCalled();
    });

    test('deve retornar erro 404 quando organizer não existe (P2003)', async () => {
      prisma.event.create.mockRejectedValue({ code: 'P2003' });

      const response = await request(app)
        .post('/api/events')
        .send({ title: 'Test', organizerId: 'invalid' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Organizer not found');
    });

    test('não deve chamar createRoadmapEsp se criação falhar', async () => {
      prisma.event.create.mockRejectedValue(new Error('Error'));

      await request(app).post('/api/events').send({});

      expect(roadmapService.createRoadmapEsp).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/events/:id', () => {
    test('deve atualizar evento', async () => {
      const mockExisting = { id: 'event1', title: 'Old' };
      const mockUpdated = { ...mockExisting, title: 'Updated', updatedAt: new Date() };

      prisma.event.findUnique.mockResolvedValue(mockExisting);
      prisma.event.update.mockResolvedValue(mockUpdated);

      const response = await request(app)
        .put('/api/events/event1')
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event updated successfully');
    });

    test('deve retornar erro 404 quando evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/events/invalid')
        .send({ title: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Event not found');
    });
  });

  describe('DELETE /api/events/:id', () => {
    test('deve deletar evento', async () => {
      const mockExisting = { id: 'event1' };
      prisma.event.findUnique.mockResolvedValue(mockExisting);
      prisma.event.delete.mockResolvedValue(mockExisting);

      const response = await request(app).delete('/api/events/event1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
      expect(response.body.message).toBe('Event deleted successfully');
    });

    test('deve retornar erro 404 quando evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      const response = await request(app).delete('/api/events/invalid');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Event not found');
    });
  });

  describe('GET /api/events/organizer/:organizerId', () => {
    test('deve buscar eventos por organizerId', async () => {
      const mockEvents = [{ id: '1', organizerId: 'org1' }];
      prisma.event.findMany.mockResolvedValue(mockEvents);
      prisma.event.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/events/organizer/org1')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Organizer events retrieved successfully');
    });
  });

  describe('GET /api/events/type/:type', () => {
    test('deve buscar eventos por type', async () => {
      const mockEvents = [{ id: '1', type: 'WEDDING' }];
      prisma.event.findMany.mockResolvedValue(mockEvents);
      prisma.event.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/events/type/WEDDING')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Events by type retrieved successfully');
    });
  });

  describe('Validação de Status do Event', () => {
    test('deve aceitar status válidos do enum EventStatus', async () => {
      const validStatuses = ['PLANNING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

      for (const status of validStatuses) {
        prisma.event.findUnique.mockResolvedValue({ id: 'event1' });
        prisma.event.update.mockResolvedValue({ id: 'event1', status });

        const response = await request(app)
          .put('/api/events/event1')
          .send({ status });

        expect(response.status).toBe(200);
      }
    });
  });
});