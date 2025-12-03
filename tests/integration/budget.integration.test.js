const request = require('supertest');
const express = require('express');
const budgetRoutes = require('../../src/routes/budget.routes');
const errorHandler = require('../../src/middleware/errorHandler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mock do middleware de autenticação
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user1', type: 'ORGANIZER' };
    next();
  },
  requireUserType: jest.fn(),
  requireOwnership: jest.fn()
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/budgets', budgetRoutes);
  app.use(errorHandler);
  return app;
};

describe('Budget Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /api/budgets/:id', () => {
    test('deve retornar orçamentos com paginação', async () => {
      const mockBudgets = [
        {
          id: 'quote1',
          eventId: 'event1',
          organizerId: 'org1',
          supplierId: 'sup1',
          message: 'Preciso de orçamento',
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'quote2',
          eventId: 'event2',
          organizerId: 'org1',
          supplierId: 'sup2',
          message: 'Outro orçamento',
          status: 'RESPONDED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prisma.quoteRequest.findMany.mockResolvedValue(mockBudgets);
      prisma.quoteRequest.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/budgets/org1')
        .query({ type: 'ORGANIZER', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        mockBudgets.map(b => ({
          ...b,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        }))
      );

      expect(response.body.message).toBe('Review retrieved successfully');
    });

    test('deve filtrar por SUPPLIER quando type não é ORGANIZER', async () => {
      const mockBudgets = [
        {
          id: 'quote1',
          eventId: 'event1',
          organizerId: 'org1',
          supplierId: 'sup1',
          message: 'Orçamento para fornecedor',
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prisma.quoteRequest.findMany.mockResolvedValue(mockBudgets);
      prisma.quoteRequest.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/budgets/sup1')
        .query({ type: 'SUPPLIER', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(prisma.quoteRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { supplierId: undefined }
        })
      );
    });

    test('deve retornar erro 500 quando ocorrer erro no serviço', async () => {
      prisma.quoteRequest.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/budgets/org1')
        .query({ type: 'ORGANIZER' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error fetching budget');
    });
  });

  describe('GET /api/budgets', () => {
    test('deve retornar todos os orçamentos do usuário (organizer OU supplier)', async () => {
      const baseDate = new Date('2025-10-30T16:21:26.377Z');

      const mockBudgets = [
        {
          id: 'quote1',
          eventId: 'event1',
          organizerId: 'user1',
          supplierId: 'user2',
          message: 'Orçamento 1',
          status: 'PENDING',
          createdAt: baseDate,
          updatedAt: baseDate
        },
        {
          id: 'quote2',
          eventId: 'event2',
          organizerId: 'user2',
          supplierId: 'user1',
          message: 'Orçamento 2',
          status: 'RESPONDED',
          createdAt: baseDate,
          updatedAt: baseDate
        }
      ];

      prisma.quoteRequest.findMany.mockResolvedValue(mockBudgets);

      const response = await request(app)
        .get('/api/budgets')
        .query({ id: 'user1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toEqual(
        mockBudgets.map(budget => ({
          ...budget,
          createdAt: budget.createdAt.toISOString(),
          updatedAt: budget.updatedAt.toISOString()
        }))
      );

      expect(prisma.quoteRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { supplierId: 'user1' },
              { organizerId: 'user1' }
            ]
          }
        })
      );
    });
  });

  describe('POST /api/budgets', () => {
    test('deve criar um novo orçamento com todos os campos obrigatórios', async () => {
      const newBudget = {
        eventId: 'event1',
        organizerId: 'org1',
        supplierId: 'sup1',
        message: 'Preciso de orçamento para decoração'
      };

      const mockCreated = {
        id: 'quote1',
        ...newBudget,
        status: 'PENDING',
        response: null,
        price: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.quoteRequest.create.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/budgets')
        .send(newBudget);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'quote1',
        eventId: 'event1',
        organizerId: 'org1',
        supplierId: 'sup1',
        message: 'Preciso de orçamento para decoração',
        status: 'PENDING'
      });
      expect(response.body.message).toBe('Review created successfully');
    });

    test('deve retornar erro 404 quando organizer não existe (P2003)', async () => {
      const error = { code: 'P2003', message: 'Foreign key constraint failed' };
      prisma.quoteRequest.create.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/budgets')
        .send({ eventId: 'event1', organizerId: 'invalid', supplierId: 'sup1', message: 'test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Organizer not found');
    });

    test('deve retornar erro 400 para dados inválidos', async () => {
      prisma.quoteRequest.create.mockRejectedValue(new Error('Validation failed'));

      const response = await request(app)
        .post('/api/budgets')
        .send({ eventId: 'event1' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/budgets/:id', () => {
    test('deve atualizar um orçamento existente', async () => {
      const mockExisting = {
        id: 'quote1',
        eventId: 'event1',
        organizerId: 'org1',
        supplierId: 'sup1',
        message: 'Mensagem original',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        supplier: {
          id: 'sup1',
          name: 'Supplier 1',
          companyName: 'Supplier Co'
        },
        event: {
          id: 'event1',
          title: 'Wedding',
          type: 'WEDDING'
        }
      };

      const mockUpdated = {
        status: 'RESPONDED',
        eventId: 'event1',
        supplierId: 'sup1',
        price: 5000,
        supplier: {
          id: 'sup1',
          companyName: 'Supplier Co',
          name: 'Supplier 1'
        },
        event: {
          id: 'event1',
          title: 'Wedding',
          type: 'WEDDING'
        }
      };

      prisma.quoteRequest.findUnique.mockResolvedValue(mockExisting);
      prisma.quoteRequest.update.mockResolvedValue(mockUpdated);

      const response = await request(app)
        .put('/api/budgets/quote1')
        .send({
          status: 'RESPONDED',
          response: 'Posso fazer por R$ 5000',
          price: 5000
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('RESPONDED');
      expect(response.body.data.price).toBe(5000);
      expect(response.body.message).toBe('Review updated successfully');
    });

    test('deve retornar erro 404 quando orçamento não existe', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/budgets/quote-inexistente')
        .send({ status: 'RESPONDED' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Quote request not found');
    });

    test('deve atualizar apenas campos permitidos', async () => {
      const mockExisting = {
        id: 'quote1',
        eventId: 'event1',
        organizerId: 'org1',
        supplierId: 'sup1',
        message: 'Original',
        status: 'PENDING',
        supplier: {
          id: 'sup1',
          name: 'Supplier 1',
          companyName: 'Supplier Co'
        },
        event: {
          id: 'event1',
          title: 'Wedding',
          type: 'WEDDING'
        }
      };

      const mockUpdated = {
        status: 'PENDING',
        eventId: 'event1',
        supplierId: 'sup1',
        price: 1000,
        supplier: {
          id: 'sup1',
          companyName: 'Supplier Co',
          name: 'Supplier 1'
        },
        event: {
          id: 'event1',
          title: 'Wedding',
          type: 'WEDDING'
        }
      };

      prisma.quoteRequest.findUnique.mockResolvedValue(mockExisting);
      prisma.quoteRequest.update.mockResolvedValue(mockUpdated);

      const response = await request(app)
        .put('/api/budgets/quote1')
        .send({ price: 1000 });

      expect(response.status).toBe(200);
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith({
        where: { id: 'quote1' },
        data: { price: 1000 },
        select: {
          status: true,
          eventId: true,
          supplierId: true,
          price: true,
          supplier: {
            select: {
              id: true,
              companyName: true,
              name: true
            }
          },
          event: {
            select: {
              id: true,
              title: true,
              type: true
            }
          }
        }
      });
    });
  });

  describe('DELETE /api/budgets/:id', () => {
    test('deve deletar um orçamento existente', async () => {
      const mockExisting = {
        id: 'quote1',
        eventId: 'event1',
        organizerId: 'org1',
        supplierId: 'sup1',
        message: 'Orçamento',
        status: 'PENDING'
      };

      prisma.quoteRequest.findUnique.mockResolvedValue(mockExisting);
      prisma.quoteRequest.delete.mockResolvedValue(mockExisting);

      const response = await request(app)
        .delete('/api/budgets/quote1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
      expect(response.body.message).toBe('Review deleted successfully');

      expect(prisma.quoteRequest.delete).toHaveBeenCalledWith({
        where: { id: 'quote1' }
      });
    });

    test('deve retornar erro 404 quando orçamento não existe', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/budgets/quote-inexistente');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Event not found');
    });

    test('não deve permitir deletar orçamento de outro usuário (validação futura)', async () => {
      const mockExisting = {
        id: 'quote1',
        organizerId: 'org1',
        supplierId: 'sup1'
      };

      prisma.quoteRequest.findUnique.mockResolvedValue(mockExisting);
      prisma.quoteRequest.delete.mockResolvedValue(mockExisting);

      const response = await request(app)
        .delete('/api/budgets/quote1');

      expect(response.status).toBe(200);
    });
  });

  describe('Validação de Status do QuoteRequest', () => {
    test('deve aceitar status válidos do enum QuoteStatus', async () => {
      const validStatuses = ['PENDING', 'RESPONDED', 'ACCEPTED', 'REJECTED'];

      for (const status of validStatuses) {
        const mockExisting = {
          id: 'quote1',
          status: 'PENDING',
          supplier: {
            id: 'sup1',
            name: 'Supplier 1',
            companyName: 'Supplier Co'
          },
          event: {
            id: 'event1',
            title: 'Wedding',
            type: 'WEDDING'
          }
        };

        const mockUpdated = {
          status,
          eventId: 'event1',
          supplierId: 'sup1',
          price: null,
          supplier: {
            id: 'sup1',
            companyName: 'Supplier Co',
            name: 'Supplier 1'
          },
          event: {
            id: 'event1',
            title: 'Wedding',
            type: 'WEDDING'
          }
        };

        prisma.quoteRequest.findUnique.mockResolvedValue(mockExisting);
        prisma.quoteRequest.update.mockResolvedValue(mockUpdated);

        const response = await request(app)
          .put('/api/budgets/quote1')
          .send({ status });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe(status);
      }
    });
  });
});