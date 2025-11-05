// tests/unit/controllers/roadmap.controller.test.js
const roadmapController = require('../../../src/controllers/roadmap.controller');
const roadmapService = require('../../../src/services/roadmap.service');
const { successResponse } = require('../../../src/middleware/responseHandler');

jest.mock('../../../src/services/roadmap.service');
jest.mock('../../../src/middleware/responseHandler');

describe('RoadmapController', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getRoadmap', () => {
    test('deve buscar roadmap por ID', async () => {
      const mockRoadmap = {
        id: 'roadmap1',
        title: 'Decoração',
        price: 5000
      };

      req.params = { id: 'roadmap1' };
      roadmapService.getRoadmap.mockResolvedValue(mockRoadmap);

      await roadmapController.getRoadmap(req, res, next);

      expect(roadmapService.getRoadmap).toHaveBeenCalledWith('roadmap1');
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockRoadmap,
        'Roadmap retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Not found');
      req.params = { id: 'invalid' };
      roadmapService.getRoadmap.mockRejectedValue(error);

      await roadmapController.getRoadmap(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    test('deve buscar roadmaps por idEvent', async () => {
      const mockRoadmaps = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' }
      ];

      req.params = { idEvent: 'event1' };
      req.query = { page: '1', limit: '10' };
      roadmapService.get.mockResolvedValue(mockRoadmaps);

      await roadmapController.get(req, res, next);

      expect(roadmapService.get).toHaveBeenCalledWith('event1', {
        type: undefined,
        page: '1',
        limit: '10'
      });
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockRoadmaps,
        'Roadmap retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve usar valores padrão de paginação', async () => {
      req.params = { idEvent: 'event1' };
      req.query = {};
      roadmapService.get.mockResolvedValue([]);

      await roadmapController.get(req, res, next);

      expect(roadmapService.get).toHaveBeenCalledWith('event1', {
        type: undefined,
        page: 1,
        limit: 10
      });
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.params = { idEvent: 'event1' };
      roadmapService.get.mockRejectedValue(error);

      await roadmapController.get(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    test('deve criar roadmap', async () => {
      const mockBody = {
        idEvent: 'event1',
        category: 'WEDDING',
        title: 'Decoração',
        price: 5000
      };
      const mockCreated = { id: 'roadmap1', ...mockBody };

      req.body = mockBody;
      roadmapService.create.mockResolvedValue(mockCreated);

      await roadmapController.create(req, res, next);

      expect(roadmapService.create).toHaveBeenCalledWith(mockBody);
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockCreated,
        'Roadmap created successfully',
        201
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.body = { title: 'Test' };
      roadmapService.create.mockRejectedValue(error);

      await roadmapController.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    test('deve atualizar roadmap', async () => {
      const mockUpdated = { id: 'roadmap1', title: 'Updated', price: 6000 };

      req.params = { id: 'roadmap1' };
      req.body = { title: 'Updated', price: 6000 };
      roadmapService.update.mockResolvedValue(mockUpdated);

      await roadmapController.update(req, res, next);

      expect(roadmapService.update).toHaveBeenCalledWith('roadmap1', {
        title: 'Updated',
        price: 6000
      });
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockUpdated,
        'Roadmap updated successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.params = { id: 'roadmap1' };
      req.body = { title: 'Test' };
      roadmapService.update.mockRejectedValue(error);

      await roadmapController.update(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    test('deve deletar roadmap', async () => {
      req.params = { id: 'roadmap1' };
      roadmapService.delete.mockResolvedValue({});

      await roadmapController.delete(req, res, next);

      expect(roadmapService.delete).toHaveBeenCalledWith('roadmap1');
      expect(successResponse).toHaveBeenCalledWith(
        res,
        null,
        'Roadmap deleted successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.params = { id: 'roadmap1' };
      roadmapService.delete.mockRejectedValue(error);

      await roadmapController.delete(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });
});