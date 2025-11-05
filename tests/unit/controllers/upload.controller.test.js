// tests/unit/controllers/upload.controller.test.js
const uploadController = require('../../../src/controllers/upload.controller');
const uploadService = require('../../../src/services/upload.service');

jest.mock('../../../src/services/upload.service');

describe('UploadController', () => {
  let req, res;

  beforeEach(() => {
    req = { params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('uploadImageBase64', () => {
    test('deve fazer upload de imagem com sucesso', async () => {
      const mockImage = {
        id: 'portfolio1',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        createdAt: new Date(),
        url: '/api/upload/portfolio1'
      };

      req.params = { supplierId: 'supplier1' };
      req.body = {
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        data: Buffer.from('test').toString('base64')
      };

      uploadService.saveImage.mockResolvedValue(mockImage);

      await uploadController.uploadImageBase64(req, res);

      expect(uploadService.saveImage).toHaveBeenCalledWith({
        supplierId: 'supplier1',
        fileBuffer: expect.any(Buffer),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: expect.any(Number)
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockImage
      });
    });

    test('deve retornar erro 400 quando fileName não é fornecido', async () => {
      req.params = { supplierId: 'supplier1' };
      req.body = {
        mimeType: 'image/jpeg',
        data: 'base64data'
      };

      await uploadController.uploadImageBase64(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Payload inválido. Esperado fileName, mimeType e data (base64).'
      });
      expect(uploadService.saveImage).not.toHaveBeenCalled();
    });

    test('deve retornar erro 400 quando mimeType não é fornecido', async () => {
      req.params = { supplierId: 'supplier1' };
      req.body = {
        fileName: 'test.jpg',
        data: 'base64data'
      };

      await uploadController.uploadImageBase64(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Payload inválido. Esperado fileName, mimeType e data (base64).'
      });
      expect(uploadService.saveImage).not.toHaveBeenCalled();
    });

    test('deve retornar erro 400 quando data não é fornecido', async () => {
      req.params = { supplierId: 'supplier1' };
      req.body = {
        fileName: 'test.jpg',
        mimeType: 'image/jpeg'
      };

      await uploadController.uploadImageBase64(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Payload inválido. Esperado fileName, mimeType e data (base64).'
      });
      expect(uploadService.saveImage).not.toHaveBeenCalled();
    });

    test('deve retornar erro 413 quando arquivo é maior que 5MB', async () => {
      const largeData = Buffer.alloc(6 * 1024 * 1024).toString('base64');

      req.params = { supplierId: 'supplier1' };
      req.body = {
        fileName: 'large.jpg',
        mimeType: 'image/jpeg',
        data: largeData
      };

      await uploadController.uploadImageBase64(req, res);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Arquivo muito grande. Máx 5MB.'
      });
      expect(uploadService.saveImage).not.toHaveBeenCalled();
    });

    test('deve retornar erro 500 quando service lança exceção', async () => {
      req.params = { supplierId: 'supplier1' };
      req.body = {
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        data: Buffer.from('test').toString('base64')
      };

      uploadService.saveImage.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await uploadController.uploadImageBase64(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao salvar imagem.'
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getImage', () => {
    test('deve retornar imagem com sucesso', async () => {
      const mockImage = {
        id: 'portfolio1',
        imageData: Buffer.from('imagedata'),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg'
      };

      req.params = { portfolioId: 'portfolio1' };
      uploadService.getImageById.mockResolvedValue(mockImage);

      await uploadController.getImage(req, res);

      expect(uploadService.getImageById).toHaveBeenCalledWith('portfolio1');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    test('deve converter imageData para Buffer se não for Buffer', async () => {
      const mockImage = {
        id: 'portfolio1',
        imageData: 'imagedata',
        mimeType: 'image/png',
        fileName: 'test.png'
      };

      req.params = { portfolioId: 'portfolio1' };
      uploadService.getImageById.mockResolvedValue(mockImage);

      await uploadController.getImage(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    test('deve retornar erro 404 quando imagem não existe', async () => {
      req.params = { portfolioId: 'invalid' };
      uploadService.getImageById.mockResolvedValue(null);

      await uploadController.getImage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Imagem não encontrada.'
      });
    });

    test('deve retornar erro 500 quando service lança exceção', async () => {
      req.params = { portfolioId: 'portfolio1' };
      uploadService.getImageById.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await uploadController.getImage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar imagem.'
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getImagesBySupplier', () => {
    test('deve buscar imagens por supplier com sucesso', async () => {
      const mockImages = [
        {
          id: 'portfolio1',
          fileName: 'test1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date(),
          url: '/api/upload/portfolio1'
        },
        {
          id: 'portfolio2',
          fileName: 'test2.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2048,
          createdAt: new Date(),
          url: '/api/upload/portfolio2'
        }
      ];

      req.params = { supplierId: 'supplier1' };
      uploadService.getImagesBySupplier.mockResolvedValue(mockImages);

      await uploadController.getImagesBySupplier(req, res);

      expect(uploadService.getImagesBySupplier).toHaveBeenCalledWith('supplier1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockImages
      });
    });

    test('deve retornar array vazio quando supplier não tem imagens', async () => {
      req.params = { supplierId: 'supplier1' };
      uploadService.getImagesBySupplier.mockResolvedValue([]);

      await uploadController.getImagesBySupplier(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    test('deve retornar erro 500 quando service lança exceção', async () => {
      req.params = { supplierId: 'supplier1' };
      uploadService.getImagesBySupplier.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await uploadController.getImagesBySupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Erro ao buscar imagens.'
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});