const reviewController = require('../../../src/controllers/review.controller');
const reviewService = require('../../../src/services/review.service');
const { successResponse } = require('../../../src/middleware/responseHandler');

jest.mock('../../../src/services/review.service');
jest.mock('../../../src/middleware/responseHandler');

describe('ReviewController', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getReviews', () => {
    test('deve buscar reviews com filtros', async () => {
      const mockResult = {
        reviews: [
          { id: '1', rating: 5, comment: 'Excelente' },
          { id: '2', rating: 4, comment: 'Bom' }
        ],
        pagination: { page: 1, limit: 10, total: 2, pages: 1 }
      };

      req.params = { id: 'org1' };
      req.query = { type: 'ORGANIZER', page: '1', limit: '10' };

      reviewService.getReview.mockResolvedValue(mockResult);

      await reviewController.getReviews(req, res, next);

      expect(reviewService.getReview).toHaveBeenCalledWith('org1', {
        type: 'ORGANIZER',
        page: '1',
        limit: '10'
      });
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockResult.reviews,
        'Review retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve usar valores padrão de paginação', async () => {
      const mockResult = {
        reviews: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      };

      req.params = { id: 'org1' };
      req.query = {};

      reviewService.getReview.mockResolvedValue(mockResult);

      await reviewController.getReviews(req, res, next);

      expect(reviewService.getReview).toHaveBeenCalledWith('org1', {
        type: undefined,
        page: 1,
        limit: 10
      });
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.params = { id: 'org1' };

      reviewService.getReview.mockRejectedValue(error);

      await reviewController.getReviews(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('createReview', () => {
    test('deve criar uma review com sucesso', async () => {
      const mockBody = {
        organizerId: 'org1',
        supplierId: 'sup1',
        eventId: 'event1',
        rating: 5,
        comment: 'Excelente serviço'
      };

      const mockCreated = { id: '1', ...mockBody };

      req.body = mockBody;

      reviewService.create.mockResolvedValue(mockCreated);

      await reviewController.createReview(req, res, next);

      expect(reviewService.create).toHaveBeenCalledWith(mockBody);
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
      req.body = { rating: 5 };

      reviewService.create.mockRejectedValue(error);

      await reviewController.createReview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('updateReview', () => {
    test('deve atualizar uma review com sucesso', async () => {
      const mockId = 'review1';
      const mockBody = { rating: 4, comment: 'Bom serviço' };
      const mockUpdated = { id: mockId, ...mockBody };

      req.params = { id: mockId };
      req.body = mockBody;

      reviewService.update.mockResolvedValue(mockUpdated);

      await reviewController.updateReview(req, res, next);

      expect(reviewService.update).toHaveBeenCalledWith(mockId, mockBody);
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockUpdated,
        'Review updated successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.params = { id: 'review1' };
      req.body = { rating: 4 };

      reviewService.update.mockRejectedValue(error);

      await reviewController.updateReview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('deleteReview', () => {
    test('deve deletar uma review com sucesso', async () => {
      const mockId = 'review1';

      req.params = { id: mockId };

      reviewService.delete.mockResolvedValue({ id: mockId });

      await reviewController.deleteReview(req, res, next);

      expect(reviewService.delete).toHaveBeenCalledWith(mockId);
      expect(successResponse).toHaveBeenCalledWith(
        res,
        null,
        'Review deleted successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.params = { id: 'review1' };

      reviewService.delete.mockRejectedValue(error);

      await reviewController.deleteReview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('getAvaliable', () => {
    test('deve buscar fornecedores disponíveis para avaliar', async () => {
      const mockResult = {
        fornecedores: [
          {
            eventoId: 'event1',
            fornecedorId: 'sup1',
            fornecedorNome: 'Supplier 1'
          }
        ],
        total: 1,
        status: 200
      };

      req.params = { id: 'org1' };

      reviewService.getAvaliable.mockResolvedValue(mockResult);

      await reviewController.getAvaliable(req, res, next);

      expect(reviewService.getAvaliable).toHaveBeenCalledWith('org1');
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockResult.fornecedores,
        'Review retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro quando ocorrer exceção', async () => {
      const error = new Error('Service error');
      req.params = { id: 'org1' };

      reviewService.getAvaliable.mockRejectedValue(error);

      await reviewController.getAvaliable(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });
});