const roadmapService = require('../../../src/services/roadmap.service');
const { PrismaClient } = require('@prisma/client');
const AppError = require('../../../src/utils/AppError');

const prisma = new PrismaClient();

describe('RoadmapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRoadmap', () => {
    test('deve buscar roadmap por ID', async () => {
      const mockRoadmap = {
        id: 'roadmap1',
        idEvent: 'event1',
        category: 'WEDDING',
        title: 'Decoração',
        description: 'Decoração completa',
        price: 5000,
        status: 'PLANNING'
      };

      prisma.roadmap.findUnique.mockResolvedValue(mockRoadmap);

      const result = await roadmapService.getRoadmap('roadmap1');

      expect(prisma.roadmap.findUnique).toHaveBeenCalledWith({
        where: { id: 'roadmap1' }
      });
      expect(result).toEqual(mockRoadmap);
    });

    test('deve lançar AppError quando ocorrer erro', async () => {
      prisma.roadmap.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(roadmapService.getRoadmap('roadmap1')).rejects.toThrow(AppError);
      await expect(roadmapService.getRoadmap('roadmap1')).rejects.toThrow(/Error fetching roadmap/);
    });
  });

  describe('get', () => {
    test('deve buscar roadmaps por idEvent', async () => {
      const mockRoadmaps = [
        { id: '1', idEvent: 'event1', title: 'Item 1' },
        { id: '2', idEvent: 'event1', title: 'Item 2' }
      ];

      prisma.roadmap.findMany.mockResolvedValue(mockRoadmaps);

      const result = await roadmapService.get('event1', { page: 1, limit: 10 });

      expect(prisma.roadmap.findMany).toHaveBeenCalledWith({
        where: { idEvent: 'event1' },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(mockRoadmaps);
    });

    test('deve usar valores padrão de paginação', async () => {
      prisma.roadmap.findMany.mockResolvedValue([]);

      await roadmapService.get('event1', {});

      expect(prisma.roadmap.findMany).toHaveBeenCalledWith({
        where: { idEvent: 'event1' },
        orderBy: { createdAt: 'desc' }
      });
    });

    test('deve lançar AppError quando ocorrer erro', async () => {
      prisma.roadmap.findMany.mockRejectedValue(new Error('Database error'));

      await expect(roadmapService.get('event1', {})).rejects.toThrow(AppError);
      await expect(roadmapService.get('event1', {})).rejects.toThrow(/Error fetching roadmap/);
    });
  });

  describe('create', () => {
    const mockBody = {
      idEvent: 'event1',
      category: 'WEDDING',
      title: 'Decoração',
      description: 'Decoração completa',
      price: 5000,
      status: 'PLANNING'
    };

    test('deve criar um novo roadmap', async () => {
      const mockCreated = { id: '1', ...mockBody };
      prisma.roadmap.create.mockResolvedValue(mockCreated);

      const result = await roadmapService.create(mockBody);

      expect(prisma.roadmap.create).toHaveBeenCalledWith({
        data: mockBody
      });
      expect(result).toEqual(mockCreated);
    });

    test('deve lançar AppError 404 quando organizer não existe (P2003)', async () => {
      prisma.roadmap.create.mockRejectedValue({ code: 'P2003' });

      await expect(roadmapService.create(mockBody)).rejects.toThrow(AppError);
      await expect(roadmapService.create(mockBody)).rejects.toThrow('Organizer not found');
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.roadmap.create.mockRejectedValue(new Error('Validation error'));

      await expect(roadmapService.create(mockBody)).rejects.toThrow(AppError);
      await expect(roadmapService.create(mockBody)).rejects.toThrow(/Error creating roadmap/);
    });
  });

  describe('createRoadmapEsp', () => {
    test('deve criar roadmap especial com todos os parâmetros', async () => {
      const mockCreated = {
        id: 'roadmap1',
        idEvent: 'event1',
        supplierId: 'supplier1',
        title: 'Empresa XYZ',
        description: 'Orçamento aceito!',
        price: 5000,
        status: 'Contratado',
        category: 'CATERING'
      };

      prisma.roadmap.create.mockResolvedValue(mockCreated);

      const result = await roadmapService.createRoadmapEsp(
        'event1',
        'supplier1',
        'Empresa XYZ',
        5000,
        'CATERING'
      );

      expect(prisma.roadmap.create).toHaveBeenCalledWith({
        data: {
          idEvent: 'event1',
          supplierId: 'supplier1',
          title: 'Empresa XYZ',
          description: 'Orçamento aceito!',
          price: 5000,
          status: 'Contratado',
          category: 'CATERING'
        }
      });
      expect(result).toEqual(mockCreated);
    });

    test('deve criar roadmap especial com parâmetros undefined', async () => {
      const mockCreated = {
        id: 'roadmap1',
        idEvent: 'event1',
        supplierId: undefined,
        title: undefined,
        description: 'Orçamento aceito!',
        price: undefined,
        status: 'Contratado',
        category: undefined
      };

      prisma.roadmap.create.mockResolvedValue(mockCreated);

      const result = await roadmapService.createRoadmapEsp('event1');

      expect(prisma.roadmap.create).toHaveBeenCalledWith({
        data: {
          idEvent: 'event1',
          supplierId: undefined,
          title: undefined,
          description: 'Orçamento aceito!',
          price: undefined,
          status: 'Contratado',
          category: undefined
        }
      });
      expect(result).toEqual(mockCreated);
    });

    test('deve lançar AppError quando ocorrer erro', async () => {
      prisma.roadmap.create.mockRejectedValue(new Error('Database error'));

      await expect(roadmapService.createRoadmapEsp('event1', 'supplier1', 'Company', 1000, 'VENUE')).rejects.toThrow(AppError);
      await expect(roadmapService.createRoadmapEsp('event1', 'supplier1', 'Company', 1000, 'VENUE')).rejects.toThrow(/Error creating roadmap/);
    });
  });

  describe('update', () => {
    const mockId = 'roadmap1';
    const mockBody = { title: 'Updated', price: 6000 };

    test('deve atualizar um roadmap existente', async () => {
      const mockExisting = { id: mockId, title: 'Old' };
      const mockUpdated = { id: mockId, ...mockBody };

      prisma.roadmap.findUnique.mockResolvedValue(mockExisting);
      prisma.roadmap.update.mockResolvedValue(mockUpdated);

      const result = await roadmapService.update(mockId, mockBody);

      expect(prisma.roadmap.findUnique).toHaveBeenCalledWith({
        where: { id: mockId }
      });
      expect(prisma.roadmap.update).toHaveBeenCalledWith({
        where: { id: mockId },
        data: mockBody
      });
      expect(result).toEqual(mockUpdated);
    });

    test('deve lançar AppError 404 quando roadmap não existe', async () => {
      prisma.roadmap.findUnique.mockResolvedValue(null);

      await expect(roadmapService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(roadmapService.update(mockId, mockBody)).rejects.toThrow('Event not found');
    });

    test('deve lançar AppError 404 quando organizer não existe (P2003)', async () => {
      prisma.roadmap.findUnique.mockResolvedValue({ id: mockId });
      prisma.roadmap.update.mockRejectedValue({ code: 'P2003' });

      await expect(roadmapService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(roadmapService.update(mockId, mockBody)).rejects.toThrow('Organizer not found');
    });

    test('deve propagar AppError existente', async () => {
      const existingError = new AppError('Custom error', 400);
      prisma.roadmap.findUnique.mockRejectedValue(existingError);

      await expect(roadmapService.update(mockId, mockBody)).rejects.toThrow(existingError);
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.roadmap.findUnique.mockResolvedValue({ id: mockId });
      prisma.roadmap.update.mockRejectedValue(new Error('Database error'));

      await expect(roadmapService.update(mockId, mockBody)).rejects.toThrow(AppError);
      await expect(roadmapService.update(mockId, mockBody)).rejects.toThrow(/Error updating roadmap/);
    });
  });

  describe('delete', () => {
    const mockId = 'roadmap1';

    test('deve deletar um roadmap existente', async () => {
      const mockExisting = { id: mockId };
      prisma.roadmap.findUnique.mockResolvedValue(mockExisting);
      prisma.roadmap.delete.mockResolvedValue(mockExisting);

      const result = await roadmapService.delete(mockId);

      expect(prisma.roadmap.findUnique).toHaveBeenCalledWith({
        where: { id: mockId }
      });
      expect(prisma.roadmap.delete).toHaveBeenCalledWith({
        where: { id: mockId }
      });
      expect(result).toEqual(mockExisting);
    });

    test('deve lançar AppError 404 quando roadmap não existe', async () => {
      prisma.roadmap.findUnique.mockResolvedValue(null);

      await expect(roadmapService.delete(mockId)).rejects.toThrow(AppError);
      await expect(roadmapService.delete(mockId)).rejects.toThrow('Event not found');
    });

    test('deve propagar AppError existente', async () => {
      const existingError = new AppError('Custom error', 400);
      prisma.roadmap.findUnique.mockRejectedValue(existingError);

      await expect(roadmapService.delete(mockId)).rejects.toThrow(existingError);
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.roadmap.findUnique.mockResolvedValue({ id: mockId });
      prisma.roadmap.delete.mockRejectedValue(new Error('Database error'));

      await expect(roadmapService.delete(mockId)).rejects.toThrow(AppError);
      await expect(roadmapService.delete(mockId)).rejects.toThrow(/Error deleting roadmap/);
    });
  });
});