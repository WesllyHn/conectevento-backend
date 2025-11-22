const uploadService = require('../../../src/services/upload.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('UploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveImage', () => {
    test('deve salvar imagem com sucesso', async () => {
      const mockImageData = {
        supplierId: 'supplier1',
        fileBuffer: Buffer.from('test image data'),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: 1024
      };

      const mockCreated = {
        id: 'portfolio1',
        supplierId: 'supplier1',
        imageData: Buffer.from('test image data'),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: 1024,
        createdAt: new Date()
      };

      prisma.portfolio.create.mockResolvedValue(mockCreated);

      const result = await uploadService.saveImage(mockImageData);

      expect(prisma.portfolio.create).toHaveBeenCalledWith({
        data: {
          supplierId: 'supplier1',
          imageData: expect.any(Buffer),
          mimeType: 'image/jpeg',
          fileName: 'test.jpg',
          fileSize: 1024
        }
      });

      expect(result).toEqual({
        id: 'portfolio1',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        createdAt: mockCreated.createdAt,
        url: '/api/upload/portfolio1'
      });
    });

    test('deve converter string para Buffer se fileBuffer não for Buffer', async () => {
      const mockImageData = {
        supplierId: 'supplier1',
        fileBuffer: 'test string data',
        mimeType: 'image/png',
        fileName: 'test.png',
        fileSize: 512
      };

      const mockCreated = {
        id: 'portfolio2',
        supplierId: 'supplier1',
        imageData: Buffer.from('test string data'),
        mimeType: 'image/png',
        fileName: 'test.png',
        fileSize: 512,
        createdAt: new Date()
      };

      prisma.portfolio.create.mockResolvedValue(mockCreated);

      const result = await uploadService.saveImage(mockImageData);

      expect(prisma.portfolio.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          imageData: expect.any(Buffer)
        })
      });

      expect(result.id).toBe('portfolio2');
    });

    test('deve lançar erro quando Prisma falha', async () => {
      const mockImageData = {
        supplierId: 'supplier1',
        fileBuffer: Buffer.from('test'),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: 1024
      };

      prisma.portfolio.create.mockRejectedValue(new Error('Database error'));

      await expect(uploadService.saveImage(mockImageData)).rejects.toThrow('Database error');
    });

    test('deve criar URL correta para a imagem', async () => {
      const mockImageData = {
        supplierId: 'supplier1',
        fileBuffer: Buffer.from('test'),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: 1024
      };

      const mockCreated = {
        id: 'custom-id-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        createdAt: new Date()
      };

      prisma.portfolio.create.mockResolvedValue(mockCreated);

      const result = await uploadService.saveImage(mockImageData);

      expect(result.url).toBe('/api/upload/custom-id-123');
    });
  });

  describe('getImageById', () => {
    test('deve buscar imagem por ID com sucesso', async () => {
      const mockImage = {
        id: 'portfolio1',
        supplierId: 'supplier1',
        imageData: Buffer.from('test image'),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: 1024,
        createdAt: new Date()
      };

      prisma.portfolio.findUnique.mockResolvedValue(mockImage);

      const result = await uploadService.getImageById('portfolio1');

      expect(prisma.portfolio.findUnique).toHaveBeenCalledWith({
        where: { id: 'portfolio1' }
      });
      expect(result).toEqual(mockImage);
    });

    test('deve retornar null quando imagem não existe', async () => {
      prisma.portfolio.findUnique.mockResolvedValue(null);

      const result = await uploadService.getImageById('invalid');

      expect(result).toBeNull();
    });

    test('deve lançar erro quando Prisma falha', async () => {
      prisma.portfolio.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(uploadService.getImageById('portfolio1')).rejects.toThrow('Database error');
    });
  });

  describe('getImagesBySupplier', () => {
    test('deve buscar todas as imagens de um supplier', async () => {
      const mockImages = [
        {
          id: 'portfolio1',
          fileName: 'test1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date('2024-01-02')
        },
        {
          id: 'portfolio2',
          fileName: 'test2.png',
          mimeType: 'image/png',
          fileSize: 2048,
          createdAt: new Date('2024-01-01')
        }
      ];

      prisma.portfolio.findMany.mockResolvedValue(mockImages);

      const result = await uploadService.getImagesBySupplier('supplier1');

      expect(prisma.portfolio.findMany).toHaveBeenCalledWith({
        where: { supplierId: 'supplier1' },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockImages[0],
        url: '/api/upload/portfolio1'
      });
      expect(result[1]).toEqual({
        ...mockImages[1],
        url: '/api/upload/portfolio2'
      });
    });

    test('deve retornar array vazio quando supplier não tem imagens', async () => {
      prisma.portfolio.findMany.mockResolvedValue([]);

      const result = await uploadService.getImagesBySupplier('supplier1');

      expect(result).toEqual([]);
    });

    test('deve ordenar imagens por data de criação (mais recente primeiro)', async () => {
      const mockImages = [
        {
          id: 'portfolio3',
          fileName: 'newest.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date('2024-01-03')
        },
        {
          id: 'portfolio1',
          fileName: 'oldest.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date('2024-01-01')
        }
      ];

      prisma.portfolio.findMany.mockResolvedValue(mockImages);

      await uploadService.getImagesBySupplier('supplier1');

      expect(prisma.portfolio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' }
        })
      );
    });

    test('deve adicionar URL para cada imagem', async () => {
      const mockImages = [
        {
          id: 'img1',
          fileName: 'test1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date()
        },
        {
          id: 'img2',
          fileName: 'test2.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2048,
          createdAt: new Date()
        }
      ];

      prisma.portfolio.findMany.mockResolvedValue(mockImages);

      const result = await uploadService.getImagesBySupplier('supplier1');

      expect(result[0].url).toBe('/api/upload/img1');
      expect(result[1].url).toBe('/api/upload/img2');
    });

    test('deve lançar erro quando Prisma falha', async () => {
      prisma.portfolio.findMany.mockRejectedValue(new Error('Database error'));

      await expect(uploadService.getImagesBySupplier('supplier1')).rejects.toThrow('Database error');
    });

    test('deve retornar apenas campos selecionados', async () => {
      const mockImages = [
        {
          id: 'portfolio1',
          fileName: 'test.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date()
        }
      ];

      prisma.portfolio.findMany.mockResolvedValue(mockImages);

      const result = await uploadService.getImagesBySupplier('supplier1');

      expect(result[0]).not.toHaveProperty('imageData');
      expect(result[0]).not.toHaveProperty('supplierId');
      
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('fileName');
      expect(result[0]).toHaveProperty('mimeType');
      expect(result[0]).toHaveProperty('fileSize');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('url');
    });
  });
});