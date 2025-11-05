// tests/integration/review.integration.test.js
const request = require('supertest');
const express = require('express');
const reviewRoutes = require('../../src/routes/review.routes');
const errorHandler = require('../../src/middleware/errorHandler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', reviewRoutes);
  app.use(errorHandler);
  return app;
};

describe('Review Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /api/reviews/:id', () => {
    test('deve retornar reviews de um organizador', async () => {
      const mockReviews = [
        {
          id: 'review1',
          organizerId: 'org1',
          supplierId: 'sup1',
          eventId: 'event1',
          rating: 5,
          comment: 'Excelente',
          createdAt: new Date(),
          event: { id: 'event1', title: 'Wedding' },
          supplier: { id: 'sup1', name: 'Supplier 1' },
          organizer: { id: 'org1', name: 'Organizer 1' }
        }
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/reviews/org1')
        .query({ type: 'ORGANIZER', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.message).toBe('Review retrieved successfully');
    });

    test('deve retornar reviews de um fornecedor', async () => {
      const mockReviews = [
        {
          id: 'review1',
          organizerId: 'org1',
          supplierId: 'sup1',
          rating: 5,
          createdAt: new Date()
        }
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/reviews/sup1')
        .query({ type: 'SUPPLIER' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { supplierId: 'sup1' }
        })
      );
    });

    test('deve aplicar paginação corretamente', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(25);

      const response = await request(app)
        .get('/api/reviews/org1')
        .query({ type: 'ORGANIZER', page: 2, limit: 10 });

      expect(response.status).toBe(200);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      );
    });

    test('deve usar valores padrão de paginação', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/reviews/org1')
        .query({ type: 'ORGANIZER' });

      expect(response.status).toBe(200);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10
        })
      );
    });

    test('deve retornar erro 500 quando ocorrer erro no service', async () => {
      prisma.review.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reviews/org1')
        .query({ type: 'ORGANIZER' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reviews/organizadorId/:id', () => {
    test('deve retornar fornecedores disponíveis para avaliar', async () => {
      const mockEventos = [
        {
          id: 'event1',
          title: 'Wedding',
          date: new Date('2025-12-31'),
          status: 'COMPLETED',
          organizerId: 'org1',
          roadmaps: [
            {
              supplierId: 'sup1',
              category: 'Decoração',
              description: 'Decoração completa',
              supplier: {
                name: 'Supplier 1',
                avatar: 'avatar1.jpg'
              }
            }
          ],
          reviews: []
        }
      ];

      prisma.event.findMany.mockResolvedValue(mockEventos);

      const response = await request(app)
        .get('/api/reviews/organizadorId/org1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({
        eventoId: 'event1',
        eventoTitulo: 'Wedding',
        eventoData: expect.any(String),
        fornecedorId: 'sup1',
        fornecedorNome: 'Supplier 1',
        fornecedorAvatar: 'avatar1.jpg',
        servicoPrestado: 'Decoração',
        descricaoServico: 'Decoração completa'
      });
    });

    test('deve retornar array vazio quando não há fornecedores disponíveis', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/reviews/organizadorId/org1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('deve filtrar fornecedores já avaliados', async () => {
      const mockEventos = [
        {
          id: 'event1',
          roadmaps: [
            {
              supplierId: 'sup1',
              supplier: { name: 'Supplier 1' }
            }
          ],
          reviews: [
            {
              supplierId: 'sup1',
              organizerId: 'org1'
            }
          ]
        }
      ];

      prisma.event.findMany.mockResolvedValue(mockEventos);

      const response = await request(app)
        .get('/api/reviews/organizadorId/org1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    test('deve retornar erro 500 quando ocorrer erro', async () => {
      prisma.event.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reviews/organizadorId/org1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/reviews', () => {
    test('deve criar review com sucesso', async () => {
      const newReview = {
        organizerId: 'org1',
        supplierId: 'sup1',
        eventId: 'event1',
        rating: 5,
        comment: 'Excelente serviço'
      };

      const mockCreated = {
        id: 'review1',
        ...newReview,
        createdAt: new Date()
      };

      // Mock para a criação da review
      prisma.review.create.mockResolvedValue(mockCreated);
      
      // Mock para o updateSupplierRating
      prisma.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prisma.user.update.mockResolvedValue({
        id: 'sup1',
        rating: 5,
        reviewCount: 1
      });

      const response = await request(app)
        .post('/api/reviews')
        .send(newReview);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review created successfully');
      expect(response.body.data.rating).toBe(5);
    });

    test('deve retornar erro 404 quando organizer não existe (P2003)', async () => {
      prisma.review.create.mockRejectedValue({ code: 'P2003' });

      const response = await request(app)
        .post('/api/reviews')
        .send({
          organizerId: 'invalid',
          supplierId: 'sup1',
          eventId: 'event1',
          rating: 5
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Organizer not found');
    });

    test('deve retornar erro 400 para outros erros', async () => {
      prisma.review.create.mockRejectedValue(new Error('Validation error'));

      const response = await request(app)
        .post('/api/reviews')
        .send({ rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    test('deve atualizar review com sucesso', async () => {
      const mockExisting = { id: 'review1', rating: 5, supplierId: 'sup1' };
      const mockUpdated = {
        id: 'review1',
        rating: 4,
        comment: 'Bom serviço',
        updatedAt: new Date()
      };

      prisma.review.findUnique.mockResolvedValue(mockExisting);
      prisma.review.update.mockResolvedValue(mockUpdated);
      
      // Mock para o updateSupplierRating
      prisma.review.findMany.mockResolvedValue([{ rating: 4 }]);
      prisma.user.update.mockResolvedValue({
        id: 'sup1',
        rating: 4,
        reviewCount: 1
      });

      const response = await request(app)
        .put('/api/reviews/review1')
        .send({ rating: 4, comment: 'Bom serviço' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review updated successfully');
      expect(response.body.data.rating).toBe(4);
    });

    test('deve retornar erro 404 quando review não existe', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/reviews/invalid')
        .send({ rating: 4 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Review not found');
    });

    test('deve retornar erro 404 quando organizer não existe (P2003)', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'review1' });
      prisma.review.update.mockRejectedValue({ code: 'P2003' });

      const response = await request(app)
        .put('/api/reviews/review1')
        .send({ organizerId: 'invalid' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Organizer not found');
    });

    test('deve retornar erro 400 para outros erros', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'review1' });
      prisma.review.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/reviews/review1')
        .send({ rating: 4 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    test('deve deletar review com sucesso', async () => {
      const mockExisting = { id: 'review1', rating: 5, supplierId: 'sup1' };
      
      prisma.review.findUnique.mockResolvedValue(mockExisting);
      prisma.review.delete.mockResolvedValue(mockExisting);
      
      // Mock para o updateSupplierRating
      prisma.review.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue({
        id: 'sup1',
        rating: 0,
        reviewCount: 0
      });

      const response = await request(app)
        .delete('/api/reviews/review1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
      expect(response.body.message).toBe('Review deleted successfully');
    });

    test('deve retornar erro 404 quando review não existe', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/reviews/invalid');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Review not found');
    });

    test('deve retornar erro 400 quando ocorrer erro no delete', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'review1' });
      prisma.review.delete.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/reviews/review1');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validação de Rating', () => {
    test('deve aceitar ratings válidos (1-5)', async () => {
      const validRatings = [1, 2, 3, 4, 5];

      for (const rating of validRatings) {
        prisma.review.create.mockResolvedValue({
          id: 'review1',
          rating,
          organizerId: 'org1',
          supplierId: 'sup1',
          eventId: 'event1'
        });
        
        // Mock para o updateSupplierRating
        prisma.review.findMany.mockResolvedValue([{ rating }]);
        prisma.user.update.mockResolvedValue({
          id: 'sup1',
          rating,
          reviewCount: 1
        });

        const response = await request(app)
          .post('/api/reviews')
          .send({
            organizerId: 'org1',
            supplierId: 'sup1',
            eventId: 'event1',
            rating
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Includes e Relacionamentos', () => {
    test('deve incluir event, supplier e organizer ao buscar reviews', async () => {
      const mockReviews = [
        {
          id: 'review1',
          rating: 5,
          event: { id: 'event1', title: 'Wedding' },
          supplier: { id: 'sup1', name: 'Supplier' },
          organizer: { id: 'org1', name: 'Organizer' }
        }
      ];

      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/reviews/org1')
        .query({ type: 'ORGANIZER' });

      expect(response.status).toBe(200);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            event: true,
            supplier: true,
            organizer: true
          }
        })
      );
    });

    test('deve incluir supplier nos roadmaps ao buscar fornecedores disponíveis', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/reviews/organizadorId/org1');

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            roadmaps: expect.objectContaining({
              include: {
                supplier: true
              }
            })
          })
        })
      );
    });
  });

  describe('Ordenação', () => {
    test('deve ordenar reviews por data de criação (desc)', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      await request(app)
        .get('/api/reviews/org1')
        .query({ type: 'ORGANIZER' });

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' }
        })
      );
    });
  });
});