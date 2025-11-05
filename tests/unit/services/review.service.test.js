// tests/unit/services/review.service.test.js
const reviewService = require('../../../src/services/review.service');
const { PrismaClient } = require('@prisma/client');
const AppError = require('../../../src/utils/AppError');

const prisma = new PrismaClient();

describe('ReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReview', () => {
    const mockReviews = [
      { id: '1', organizerId: 'org1', supplierId: 'sup1', rating: 5 },
      { id: '2', organizerId: 'org1', supplierId: 'sup2', rating: 4 }
    ];

    test('deve buscar reviews por organizerId quando type é ORGANIZER', async () => {
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(2);

      const filters = { type: 'ORGANIZER', page: 1, limit: 10 };
      const result = await reviewService.getReview('org1', filters);

      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { organizerId: 'org1' },
        include: {
          event: true,
          supplier: true,
          organizer: true
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });

      expect(result.reviews).toEqual(mockReviews);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    test('deve buscar reviews por supplierId quando type não é ORGANIZER', async () => {
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(2);

      const filters = { type: 'SUPPLIER', page: 1, limit: 10 };
      const result = await reviewService.getReview('sup1', filters);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { supplierId: 'sup1' }
        })
      );
    });

    test('deve calcular paginação corretamente', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(25);

      const filters = { type: 'ORGANIZER', page: 2, limit: 10 };
      const result = await reviewService.getReview('org1', filters);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        pages: 3
      });
    });

    test('deve usar valores padrão de paginação', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);

      const result = await reviewService.getReview('org1', {});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    test('deve lançar AppError quando ocorrer erro', async () => {
      prisma.review.findMany.mockRejectedValue(new Error('Database error'));

      await expect(reviewService.getReview('org1', {})).rejects.toThrow(AppError);
      await expect(reviewService.getReview('org1', {})).rejects.toThrow(/Error fetching reviews/);
    });
  });

  describe('getAvaliable', () => {
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

      const result = await reviewService.getAvaliable('org1');

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: {
          organizerId: 'org1',
          status: 'COMPLETED'
        },
        include: {
          roadmaps: {
            where: {
              supplierId: { not: null }
            },
            include: {
              supplier: true
            }
          },
          reviews: {
            where: {
              organizerId: 'org1'
            }
          }
        }
      });

      expect(result.fornecedores).toHaveLength(1);
      expect(result.fornecedores[0]).toEqual({
        eventoId: 'event1',
        eventoTitulo: 'Wedding',
        eventoData: expect.any(Date),
        fornecedorId: 'sup1',
        fornecedorNome: 'Supplier 1',
        fornecedorAvatar: 'avatar1.jpg',
        servicoPrestado: 'Decoração',
        descricaoServico: 'Decoração completa'
      });
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

      const result = await reviewService.getAvaliable('org1');

      expect(result.fornecedores).toHaveLength(0);
    });

    test('deve retornar array vazio quando não há eventos', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      const result = await reviewService.getAvaliable('org1');

      expect(result.fornecedores).toEqual([]);
    });

    test('deve retornar array vazio quando todos já foram avaliados', async () => {
      const mockEventos = [
        {
          id: 'event1',
          roadmaps: [],
          reviews: []
        }
      ];

      prisma.event.findMany.mockResolvedValue(mockEventos);

      const result = await reviewService.getAvaliable('org1');

      expect(result.fornecedores).toEqual([]);
    });

    test('deve lançar AppError quando ocorrer erro', async () => {
      prisma.event.findMany.mockRejectedValue(new Error('Database error'));

      await expect(reviewService.getAvaliable('org1')).rejects.toThrow(AppError);
      await expect(reviewService.getAvaliable('org1')).rejects.toThrow(/Error fetching reviews/);
    });
  });

  describe('create', () => {
    const mockBody = {
      organizerId: 'org1',
      supplierId: 'sup1',
      eventId: 'event1',
      rating: 5,
      comment: 'Excelente serviço'
    };

    test('deve criar uma nova review e atualizar rating do supplier', async () => {
      const mockCreated = { id: '1', ...mockBody };
      const mockReviews = [
        { rating: 5 },
        { rating: 4 }
      ];

      prisma.review.create.mockResolvedValue(mockCreated);
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.user.update.mockResolvedValue({ id: 'sup1', rating: 4.5, reviewCount: 2 });

      const result = await reviewService.create(mockBody);

      expect(prisma.review.create).toHaveBeenCalledWith({
        data: mockBody
      });
      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { supplierId: 'sup1' },
        select: { rating: true }
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'sup1' },
        data: {
          rating: 4.5,
          reviewCount: 2
        }
      });
      expect(result).toEqual(mockCreated);
    });

    test('deve lançar AppError 404 quando organizer não existe (P2003)', async () => {
      prisma.review.create.mockRejectedValue({ code: 'P2003' });

      await expect(reviewService.create(mockBody)).rejects.toThrow(AppError);
      await expect(reviewService.create(mockBody)).rejects.toThrow('Organizer not found');
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.review.create.mockRejectedValue(new Error('Validation error'));

      await expect(reviewService.create(mockBody)).rejects.toThrow(AppError);
      await expect(reviewService.create(mockBody)).rejects.toThrow(/Error creating review/);
    });
  });

  describe('update', () => {
    const mockId = 'review1';
    const mockBody = { rating: 4, comment: 'Bom serviço' };

    test('deve atualizar uma review existente e atualizar rating do supplier', async () => {
      const mockExisting = { id: mockId, rating: 5, supplierId: 'sup1' };
      const mockUpdated = { id: mockId, ...mockBody, supplierId: 'sup1' };
      const mockReviews = [
        { rating: 4 },
        { rating: 5 }
      ];

      prisma.review.findUnique.mockResolvedValue(mockExisting);
      prisma.review.update.mockResolvedValue(mockUpdated);
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.user.update.mockResolvedValue({ id: 'sup1', rating: 4.5, reviewCount: 2 });

      const result = await reviewService.update(mockId, mockBody);

      expect(prisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: mockId }
      });
      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: mockId },
        data: mockBody
      });
      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { supplierId: 'sup1' },
        select: { rating: true }
      });
      expect(result).toEqual(mockUpdated);
    });

    test('deve lançar AppError 404 quando review não existe', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(reviewService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(reviewService.update(mockId, mockBody)).rejects.toThrow('Review not found');
    });

    test('deve lançar AppError 404 quando organizer não existe (P2003)', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: mockId, supplierId: 'sup1' });
      prisma.review.update.mockRejectedValue({ code: 'P2003' });

      await expect(reviewService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(reviewService.update(mockId, mockBody)).rejects.toThrow('Organizer not found');
    });

    test('deve propagar AppError existente', async () => {
      const existingError = new AppError('Custom error', 400);
      prisma.review.findUnique.mockRejectedValue(existingError);

      await expect(reviewService.update(mockId, mockBody)).rejects.toThrow(existingError);
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: mockId, supplierId: 'sup1' });
      prisma.review.update.mockRejectedValue(new Error('Database error'));

      await expect(reviewService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(reviewService.update(mockId, mockBody)).rejects.toThrow(/Error updating review/);
    });
  });

  describe('delete', () => {
    const mockId = 'review1';

    test('deve deletar uma review existente e atualizar rating do supplier', async () => {
      const mockExisting = { id: mockId, rating: 5, supplierId: 'sup1' };
      const mockReviews = [
        { rating: 4 }
      ];

      prisma.review.findUnique.mockResolvedValue(mockExisting);
      prisma.review.delete.mockResolvedValue(mockExisting);
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.user.update.mockResolvedValue({ id: 'sup1', rating: 4, reviewCount: 1 });

      const result = await reviewService.delete(mockId);

      expect(prisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: mockId }
      });
      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { id: mockId }
      });
      expect(prisma.review.findMany).toHaveBeenCalledWith({
        where: { supplierId: 'sup1' },
        select: { rating: true }
      });
      expect(result).toEqual(mockExisting);
    });

    test('deve lançar AppError 404 quando review não existe', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(reviewService.delete(mockId)).rejects.toThrow(AppError);
      await expect(reviewService.delete(mockId)).rejects.toThrow('Review not found');
    });

    test('deve propagar AppError existente', async () => {
      const existingError = new AppError('Custom error', 400);
      prisma.review.findUnique.mockRejectedValue(existingError);

      await expect(reviewService.delete(mockId)).rejects.toThrow(existingError);
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: mockId, supplierId: 'sup1' });
      prisma.review.delete.mockRejectedValue(new Error('Database error'));

      await expect(reviewService.delete(mockId)).rejects.toThrow(AppError);
      await expect(reviewService.delete(mockId)).rejects.toThrow(/Error deleting review/);
    });
  });
});