// tests/integration/roadmap.integration.test.js
const request = require('supertest');
const express = require('express');
const roadmapRoutes = require('../../src/routes/roadmap.routes');
const errorHandler = require('../../src/middleware/errorHandler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/roadmaps', roadmapRoutes);
  app.use(errorHandler);
  return app;
};

describe('Roadmap Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /api/roadmaps/:id', () => {
    test('deve retornar roadmap por ID', async () => {
      const mockRoadmap = {
        id: 'roadmap1',
        idEvent: 'event1',
        category: 'WEDDING',
        title: 'Decoração',
        description: 'Decoração completa',
        price: 5000,
        status: 'PLANNING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.roadmap.findUnique.mockResolvedValue(mockRoadmap);

      const response = await request(app).get('/api/roadmaps/roadmap1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Roadmap retrieved successfully');
    });

    test('deve retornar erro 500 quando ocorrer erro', async () => {
      prisma.roadmap.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/roadmaps/roadmap1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/roadmaps/eventId/:idEvent', () => {
    test('deve retornar roadmaps por idEvent', async () => {
      const mockRoadmaps = [
        {
          id: 'roadmap1',
          idEvent: 'event1',
          title: 'Item 1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'roadmap2',
          idEvent: 'event1',
          title: 'Item 2',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prisma.roadmap.findMany.mockResolvedValue(mockRoadmaps);

      const response = await request(app)
        .get('/api/roadmaps/eventId/event1')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.message).toBe('Roadmap retrieved successfully');
    });

    test('deve retornar erro 500 quando ocorrer erro', async () => {
      prisma.roadmap.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/roadmaps/eventId/event1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/roadmaps', () => {
    test('deve criar novo roadmap', async () => {
      const newRoadmap = {
        idEvent: 'event1',
        category: 'WEDDING',
        title: 'Decoração',
        description: 'Decoração completa',
        price: 5000,
        status: 'PLANNING'
      };

      const mockCreated = {
        id: 'roadmap1',
        ...newRoadmap,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.roadmap.create.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/roadmaps')
        .send(newRoadmap);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Roadmap created successfully');
    });

    test('deve retornar erro 404 quando organizer não existe (P2003)', async () => {
      prisma.roadmap.create.mockRejectedValue({ code: 'P2003' });

      const response = await request(app)
        .post('/api/roadmaps')
        .send({ idEvent: 'invalid', title: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Organizer not found');
    });

    test('deve retornar erro 400 para dados inválidos', async () => {
      prisma.roadmap.create.mockRejectedValue(new Error('Validation failed'));

      const response = await request(app)
        .post('/api/roadmaps')
        .send({ title: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/roadmaps/:id', () => {
    test('deve atualizar roadmap existente', async () => {
      const mockExisting = {
        id: 'roadmap1',
        title: 'Old Title',
        price: 5000
      };

      const mockUpdated = {
        ...mockExisting,
        title: 'Updated Title',
        price: 6000,
        updatedAt: new Date()
      };

      prisma.roadmap.findUnique.mockResolvedValue(mockExisting);
      prisma.roadmap.update.mockResolvedValue(mockUpdated);

      const response = await request(app)
        .put('/api/roadmaps/roadmap1')
        .send({ title: 'Updated Title', price: 6000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Roadmap updated successfully');
    });

    test('deve retornar erro 404 quando roadmap não existe', async () => {
      prisma.roadmap.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/roadmaps/invalid')
        .send({ title: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Event not found');
    });
  });

  describe('DELETE /api/roadmaps/:id', () => {
    test('deve deletar roadmap existente', async () => {
      const mockExisting = { id: 'roadmap1' };
      prisma.roadmap.findUnique.mockResolvedValue(mockExisting);
      prisma.roadmap.delete.mockResolvedValue(mockExisting);

      const response = await request(app).delete('/api/roadmaps/roadmap1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
      expect(response.body.message).toBe('Roadmap deleted successfully');
    });

    test('deve retornar erro 404 quando roadmap não existe', async () => {
      prisma.roadmap.findUnique.mockResolvedValue(null);

      const response = await request(app).delete('/api/roadmaps/invalid');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Event not found');
    });
  });
});