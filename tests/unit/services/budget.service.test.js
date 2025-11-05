// tests/unit/services/budget.service.test.js
const budgetService = require('../../../src/services/budget.service');
const roadmapService = require('../../../src/services/roadmap.service');
const { PrismaClient } = require('@prisma/client');
const AppError = require('../../../src/utils/AppError');

const prisma = new PrismaClient();
jest.mock('../../../src/services/roadmap.service');

describe('BudgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });



  describe('getBudget', () => {
    const mockBudgets = [
      { id: '1', organizerId: 'org1', supplierId: 'sup1' },
      { id: '2', organizerId: 'org1', supplierId: 'sup2' }
    ];

    test('deve buscar orçamentos por organizerId quando type é ORGANIZER', async () => {
      prisma.quoteRequest.findMany.mockResolvedValue(mockBudgets);
      prisma.quoteRequest.count.mockResolvedValue(2);

      const filters = { type: 'ORGANIZER', page: 1, limit: 10 };
      const result = await budgetService.getBudget('org1', filters);

      expect(prisma.quoteRequest.findMany).toHaveBeenCalledWith({
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

      expect(result.response).toEqual(mockBudgets);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    test('deve buscar orçamentos por supplierId quando type não é ORGANIZER', async () => {
      prisma.quoteRequest.findMany.mockResolvedValue(mockBudgets);
      prisma.quoteRequest.count.mockResolvedValue(2);

      const filters = { type: 'SUPPLIER', page: 1, limit: 10 };
      const result = await budgetService.getBudget('sup1', filters);

      expect(prisma.quoteRequest.findMany).toHaveBeenCalledWith({
        where: { supplierId: 'sup1' },
        include: {
          event: true,
          supplier: true,
          organizer: true
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    test('deve calcular paginação corretamente', async () => {
      prisma.quoteRequest.findMany.mockResolvedValue([]);
      prisma.quoteRequest.count.mockResolvedValue(25);

      const filters = { type: 'ORGANIZER', page: 2, limit: 10 };
      const result = await budgetService.getBudget('org1', filters);

      expect(prisma.quoteRequest.findMany).toHaveBeenCalledWith(
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
      prisma.quoteRequest.findMany.mockResolvedValue([]);
      prisma.quoteRequest.count.mockResolvedValue(0);

      const result = await budgetService.getBudget('org1', {});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    test('deve lançar AppError quando ocorrer erro', async () => {
      prisma.quoteRequest.findMany.mockRejectedValue(new Error('Database error'));

      await expect(budgetService.getBudget('org1', {})).rejects.toThrow(AppError);
      await expect(budgetService.getBudget('org1', {})).rejects.toThrow(/Error fetching budget/);
    });
  });

  describe('budget', () => {
    const mockBudgets = [
      { id: '1', organizerId: 'user1', supplierId: 'user2' },
      { id: '2', organizerId: 'user2', supplierId: 'user1' }
    ];

    test('deve buscar orçamentos onde o usuário é organizer ou supplier', async () => {
      prisma.quoteRequest.findMany.mockResolvedValue(mockBudgets);

      const result = await budgetService.budget('user1');

      expect(prisma.quoteRequest.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { supplierId: 'user1' },
            { organizerId: 'user1' }
          ]
        },
        include: {
          event: true,
          supplier: true,
          organizer: true
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(result).toEqual(mockBudgets);
    });

    test('deve lançar AppError quando ocorrer erro', async () => {
      prisma.quoteRequest.findMany.mockRejectedValue(new Error('Database error'));

      await expect(budgetService.budget('user1')).rejects.toThrow(AppError);
    });
  });

  describe('create', () => {
    const mockBody = {
      eventId: 'event1',
      organizerId: 'org1',
      supplierId: 'sup1',
      description: 'Test budget'
    };

    test('deve criar um novo orçamento', async () => {
      const mockCreated = { id: '1', ...mockBody };
      prisma.quoteRequest.create.mockResolvedValue(mockCreated);

      const result = await budgetService.create(mockBody);

      expect(prisma.quoteRequest.create).toHaveBeenCalledWith({
        data: mockBody
      });
      expect(result).toEqual(mockCreated);
    });

    test('deve lançar AppError 404 quando organizer não existe (P2003)', async () => {
      prisma.quoteRequest.create.mockRejectedValue({ code: 'P2003' });

      await expect(budgetService.create(mockBody)).rejects.toThrow(AppError);
      await expect(budgetService.create(mockBody)).rejects.toThrow('Organizer not found');
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.quoteRequest.create.mockRejectedValue(new Error('Validation error'));

      await expect(budgetService.create(mockBody)).rejects.toThrow(AppError);
      await expect(budgetService.create(mockBody)).rejects.toThrow(/Error creating budget/);
    });
  });

  describe('update', () => {
    const mockId = 'budget1';
    const mockBody = { description: 'Updated description' };

    test('deve atualizar um orçamento existente sem status ACCEPTED', async () => {
      const mockExisting = { 
        id: mockId, 
        description: 'Old description',
        supplier: { id: 'sup1', name: 'Supplier 1' },
        event: { id: 'event1', title: 'Event 1', type: 'WEDDING' }
      };
      const mockUpdated = { 
        id: mockId, 
        status: 'PENDING',
        eventId: 'event1',
        supplierId: 'sup1',
        price: 1000,
        supplier: { id: 'sup1', companyName: 'Company A', name: 'Supplier 1' },
        event: { id: 'event1', title: 'Event 1', type: 'WEDDING' }
      };

      prisma.quoteRequest.findUnique.mockResolvedValue(mockExisting);
      prisma.quoteRequest.update.mockResolvedValue(mockUpdated);

      const result = await budgetService.update(mockId, mockBody);

      expect(prisma.quoteRequest.findUnique).toHaveBeenCalledWith({
        where: { id: mockId },
        include: {
          supplier: true,
          event: true
        }
      });
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith({
        where: { id: mockId },
        data: mockBody,
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
      expect(roadmapService.createRoadmapEsp).not.toHaveBeenCalled();
      expect(result).toEqual(mockUpdated);
    });

    test('deve criar roadmap quando status é ACCEPTED', async () => {
      const mockExisting = { 
        id: mockId, 
        description: 'Old description',
        supplier: { id: 'sup1', name: 'Supplier 1' },
        event: { id: 'event1', title: 'Event 1', type: 'WEDDING' }
      };
      const mockUpdated = { 
        id: mockId, 
        status: 'ACCEPTED',
        eventId: 'event1',
        supplierId: 'sup1',
        price: 5000,
        supplier: { id: 'sup1', companyName: 'Company A', name: 'Supplier 1' },
        event: { id: 'event1', title: 'Event 1', type: 'WEDDING' }
      };

      prisma.quoteRequest.findUnique.mockResolvedValue(mockExisting);
      prisma.quoteRequest.update.mockResolvedValue(mockUpdated);
      roadmapService.createRoadmapEsp.mockResolvedValue({ id: 'roadmap1' });

      const result = await budgetService.update(mockId, { status: 'ACCEPTED' });

      expect(roadmapService.createRoadmapEsp).toHaveBeenCalledWith(
        'event1',
        'sup1',
        'Company A',
        5000,
        'WEDDING'
      );
      expect(result).toEqual(mockUpdated);
    });

    test('deve lançar AppError 404 quando orçamento não existe', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(null);

      await expect(budgetService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(budgetService.update(mockId, mockBody)).rejects.toThrow('Quote request not found');
    });

    test('deve lançar AppError 404 quando organizer não existe (P2003)', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({ 
        id: mockId,
        supplier: { id: 'sup1' },
        event: { id: 'event1' }
      });
      prisma.quoteRequest.update.mockRejectedValue({ code: 'P2003' });

      await expect(budgetService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(budgetService.update(mockId, mockBody)).rejects.toThrow('Organizer not found');
    });

    test('deve propagar AppError existente', async () => {
      const existingError = new AppError('Custom error', 400);
      prisma.quoteRequest.findUnique.mockRejectedValue(existingError);

      await expect(budgetService.update(mockId, mockBody)).rejects.toThrow(existingError);
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({ 
        id: mockId,
        supplier: { id: 'sup1' },
        event: { id: 'event1' }
      });
      prisma.quoteRequest.update.mockRejectedValue(new Error('Database error'));

      await expect(budgetService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(budgetService.update(mockId, mockBody)).rejects.toThrow(/Error updating budget/);
    });
  });

  describe('delete', () => {
    const mockId = 'budget1';

    test('deve deletar um orçamento existente', async () => {
      const mockExisting = { id: mockId, description: 'Budget' };
      const mockDeleted = { ...mockExisting };

      prisma.quoteRequest.findUnique.mockResolvedValue(mockExisting);
      prisma.quoteRequest.delete.mockResolvedValue(mockDeleted);

      const result = await budgetService.delete(mockId);

      expect(prisma.quoteRequest.findUnique).toHaveBeenCalledWith({
        where: { id: mockId }
      });
      expect(prisma.quoteRequest.delete).toHaveBeenCalledWith({
        where: { id: mockId }
      });
      expect(result).toEqual(mockDeleted);
    });

    test('deve lançar AppError 404 quando orçamento não existe', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(null);

      await expect(budgetService.delete(mockId)).rejects.toThrow(AppError);
      await expect(budgetService.delete(mockId)).rejects.toThrow('Event not found');
    });

    test('deve propagar AppError existente', async () => {
      const existingError = new AppError('Custom error', 400);
      prisma.quoteRequest.findUnique.mockRejectedValue(existingError);

      await expect(budgetService.delete(mockId)).rejects.toThrow(existingError);
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({ id: mockId });
      prisma.quoteRequest.delete.mockRejectedValue(new Error('Database error'));

      await expect(budgetService.delete(mockId)).rejects.toThrow(/Error deleting event/);
    });
  });
});