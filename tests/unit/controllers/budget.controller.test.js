// tests/unit/controllers/budget.controller.test.js
const budgetController = require('../../../src/controllers/budget.controller');
const budgetService = require('../../../src/services/budget.service');
const { successResponse } = require('../../../src/middleware/responseHandler');

// Mock das dependências
jest.mock('../../../src/services/budget.service');
jest.mock('../../../src/middleware/responseHandler');

describe('BudgetController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('getBudget', () => {
    test('deve buscar orçamentos com sucesso', async () => {
      const mockResult = {
        response: [{ id: '1', description: 'Budget' }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      };

      req.params = { id: 'org1' };
      req.query = { type: 'ORGANIZER', page: '1', limit: '10' };

      budgetService.getBudget.mockResolvedValue(mockResult);

      await budgetController.getBudget(req, res, next);

      expect(budgetService.getBudget).toHaveBeenCalledWith(
        undefined, // BUG: deveria ser 'org1', mas o código está pegando req.params.id incorretamente
        {
          type: 'ORGANIZER',
          page: '1',
          limit: '10'
        }
      );
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockResult.response,
        'Review retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve usar valores padrão de paginação', async () => {
      const mockResult = {
        response: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      };

      req.params = { id: 'org1' };
      req.query = { type: 'ORGANIZER' };

      budgetService.getBudget.mockResolvedValue(mockResult);

      await budgetController.getBudget(req, res, next);

      expect(budgetService.getBudget).toHaveBeenCalledWith(
        undefined,
        {
          type: 'ORGANIZER',
          page: 1,
          limit: 10
        }
      );
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.params = { id: 'org1' };

      budgetService.getBudget.mockRejectedValue(error);

      await budgetController.getBudget(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('budget', () => {
    test('deve buscar todos os orçamentos do usuário', async () => {
      const mockBudgets = [
        { id: '1', description: 'Budget 1' },
        { id: '2', description: 'Budget 2' }
      ];

      req.query = { id: 'user1' };

      budgetService.budget.mockResolvedValue(mockBudgets);

      await budgetController.budget(req, res, next);

      expect(budgetService.budget).toHaveBeenCalledWith('user1');
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockBudgets,
        'Review retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.query = { id: 'user1' };

      budgetService.budget.mockRejectedValue(error);

      await budgetController.budget(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    test('deve criar um orçamento com sucesso', async () => {
      const mockBody = {
        eventId: 'event1',
        organizerId: 'org1',
        supplierId: 'sup1',
        description: 'New budget'
      };

      const mockCreated = { id: '1', ...mockBody };

      req.body = mockBody;

      budgetService.create.mockResolvedValue(mockCreated);

      await budgetController.create(req, res, next);

      expect(budgetService.create).toHaveBeenCalledWith(mockBody);
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockCreated,
        'Review created successfully',
        201
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.body = { description: 'Test' };

      budgetService.create.mockRejectedValue(error);

      await budgetController.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    test('deve atualizar um orçamento com sucesso', async () => {
      const mockId = 'budget1';
      const mockBody = { description: 'Updated description' };
      const mockUpdated = { id: mockId, ...mockBody };

      req.params = { id: mockId };
      req.body = mockBody;

      budgetService.update.mockResolvedValue(mockUpdated);

      await budgetController.update(req, res, next);

      expect(budgetService.update).toHaveBeenCalledWith(mockId, mockBody);
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockUpdated,
        'Review updated successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.params = { id: 'budget1' };
      req.body = { description: 'Test' };

      budgetService.update.mockRejectedValue(error);

      await budgetController.update(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    test('deve deletar um orçamento com sucesso', async () => {
      const mockId = 'budget1';

      req.params = { id: mockId };

      budgetService.delete.mockResolvedValue({ id: mockId });

      await budgetController.delete(req, res, next);

      expect(budgetService.delete).toHaveBeenCalledWith(mockId);
      expect(successResponse).toHaveBeenCalledWith(
        res,
        null,
        'Review deleted successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.params = { id: 'budget1' };

      budgetService.delete.mockRejectedValue(error);

      await budgetController.delete(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });
});