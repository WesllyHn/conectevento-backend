// tests/integration/upload.integration.test.js
const request = require('supertest');
const express = require('express');
const uploadRoutes = require('../../src/routes/upload.routes');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createApp = () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/upload', uploadRoutes);
  return app;
};

describe('Upload Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('POST /api/upload/:supplierId', () => {
    test('deve fazer upload de imagem com sucesso', async () => {
      const mockCreated = {
        id: 'portfolio1',
        supplierId: 'supplier1',
        imageData: Buffer.from('test image'),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: 1024,
        createdAt: new Date()
      };

      prisma.portfolio.create.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/upload/supplier1')
        .send({
          fileName: 'test.jpg',
          mimeType: 'image/jpeg',
          data: Buffer.from('test image').toString('base64')
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data.fileName).toBe('test.jpg');
      expect(response.body.data.mimeType).toBe('image/jpeg');
    });

    test('deve retornar erro 400 quando fileName está ausente', async () => {
      const response = await request(app)
        .post('/api/upload/supplier1')
        .send({
          mimeType: 'image/jpeg',
          data: 'base64data'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payload inválido. Esperado fileName, mimeType e data (base64).');
    });

    test('deve retornar erro 400 quando mimeType está ausente', async () => {
      const response = await request(app)
        .post('/api/upload/supplier1')
        .send({
          fileName: 'test.jpg',
          data: 'base64data'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payload inválido. Esperado fileName, mimeType e data (base64).');
    });

    test('deve retornar erro 400 quando data está ausente', async () => {
      const response = await request(app)
        .post('/api/upload/supplier1')
        .send({
          fileName: 'test.jpg',
          mimeType: 'image/jpeg'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payload inválido. Esperado fileName, mimeType e data (base64).');
    });

    test('deve retornar erro 413 quando arquivo excede 5MB', async () => {
      const largeData = Buffer.alloc(6 * 1024 * 1024).toString('base64');

      const response = await request(app)
        .post('/api/upload/supplier1')
        .send({
          fileName: 'large.jpg',
          mimeType: 'image/jpeg',
          data: largeData
        });

      expect(response.status).toBe(413);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Arquivo muito grande. Máx 5MB.');
    });

    test('deve aceitar arquivo de exatamente 5MB', async () => {
      const maxSizeData = Buffer.alloc(5 * 1024 * 1024).toString('base64');
      const mockCreated = {
        id: 'portfolio1',
        fileName: 'max.jpg',
        mimeType: 'image/jpeg',
        fileSize: 5 * 1024 * 1024,
        createdAt: new Date()
      };

      prisma.portfolio.create.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/upload/supplier1')
        .send({
          fileName: 'max.jpg',
          mimeType: 'image/jpeg',
          data: maxSizeData
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('deve retornar erro 500 quando Prisma falha', async () => {
      prisma.portfolio.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/upload/supplier1')
        .send({
          fileName: 'test.jpg',
          mimeType: 'image/jpeg',
          data: Buffer.from('test').toString('base64')
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Erro ao salvar imagem.');
    });

    test('deve aceitar diferentes tipos MIME', async () => {
      const mimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      for (const mimeType of mimeTypes) {
        const mockCreated = {
          id: 'portfolio1',
          fileName: 'test.jpg',
          mimeType,
          fileSize: 1024,
          createdAt: new Date()
        };

        prisma.portfolio.create.mockResolvedValue(mockCreated);

        const response = await request(app)
          .post('/api/upload/supplier1')
          .send({
            fileName: 'test.jpg',
            mimeType,
            data: Buffer.from('test').toString('base64')
          });

        expect(response.status).toBe(201);
        expect(response.body.data.mimeType).toBe(mimeType);
      }
    });
  });

  describe('GET /api/upload/:portfolioId', () => {
    test('deve retornar imagem com sucesso', async () => {
      const mockImage = {
        id: 'portfolio1',
        imageData: Buffer.from('test image data'),
        mimeType: 'image/jpeg',
        fileName: 'test.jpg',
        fileSize: 1024
      };

      prisma.portfolio.findUnique.mockResolvedValue(mockImage);

      const response = await request(app)
        .get('/api/upload/portfolio1');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    test('deve retornar imagem PNG com Content-Type correto', async () => {
      const mockImage = {
        id: 'portfolio1',
        imageData: Buffer.from('png data'),
        mimeType: 'image/png',
        fileName: 'test.png',
        fileSize: 2048
      };

      prisma.portfolio.findUnique.mockResolvedValue(mockImage);

      const response = await request(app)
        .get('/api/upload/portfolio1');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    test('deve retornar erro 404 quando imagem não existe', async () => {
      prisma.portfolio.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/upload/invalid');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Imagem não encontrada.');
    });

    test('deve retornar erro 500 quando Prisma falha', async () => {
      prisma.portfolio.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/upload/portfolio1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Erro ao buscar imagem.');
    });

    test('deve converter imageData não-Buffer para Buffer', async () => {
      const mockImage = {
        id: 'portfolio1',
        imageData: 'string data',
        mimeType: 'image/jpeg',
        fileName: 'test.jpg'
      };

      prisma.portfolio.findUnique.mockResolvedValue(mockImage);

      const response = await request(app)
        .get('/api/upload/portfolio1');

      expect(response.status).toBe(200);
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });
  });

  describe('GET /api/upload/supplier/:supplierId', () => {
    test('deve retornar todas as imagens de um supplier', async () => {
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

      const response = await request(app)
        .get('/api/upload/supplier/supplier1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('url');
      expect(response.body.data[0].url).toBe('/api/upload/portfolio1');
      expect(response.body.data[1].url).toBe('/api/upload/portfolio2');
    });

    test('deve retornar array vazio quando supplier não tem imagens', async () => {
      prisma.portfolio.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/upload/supplier/supplier1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('deve retornar erro 500 quando Prisma falha', async () => {
      prisma.portfolio.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/upload/supplier/supplier1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Erro ao buscar imagens.');
    });

    test('deve retornar imagens ordenadas por data (mais recente primeiro)', async () => {
      const mockImages = [
        {
          id: 'portfolio3',
          fileName: 'newest.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date('2024-01-03')
        },
        {
          id: 'portfolio2',
          fileName: 'middle.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date('2024-01-02')
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

      const response = await request(app)
        .get('/api/upload/supplier/supplier1');

      expect(response.status).toBe(200);
      expect(response.body.data[0].fileName).toBe('newest.jpg');
      expect(response.body.data[2].fileName).toBe('oldest.jpg');
    });

    test('não deve incluir imageData na resposta', async () => {
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

      const response = await request(app)
        .get('/api/upload/supplier/supplier1');

      expect(response.status).toBe(200);
      expect(response.body.data[0]).not.toHaveProperty('imageData');
      expect(response.body.data[0]).not.toHaveProperty('supplierId');
    });

    test('deve incluir todos os metadados necessários', async () => {
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

      const response = await request(app)
        .get('/api/upload/supplier/supplier1');

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('fileName');
      expect(response.body.data[0]).toHaveProperty('mimeType');
      expect(response.body.data[0]).toHaveProperty('fileSize');
      expect(response.body.data[0]).toHaveProperty('createdAt');
      expect(response.body.data[0]).toHaveProperty('url');
    });
  });

  describe('Roteamento', () => {
    test('POST deve ter precedência sobre GET para mesmo path', async () => {
      const mockCreated = {
        id: 'portfolio1',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        createdAt: new Date()
      };

      prisma.portfolio.create.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/upload/supplier1')
        .send({
          fileName: 'test.jpg',
          mimeType: 'image/jpeg',
          data: Buffer.from('test').toString('base64')
        });

      expect(response.status).toBe(201);
      expect(prisma.portfolio.create).toHaveBeenCalled();
    });

    test('GET /supplier/:id deve ter precedência sobre GET /:id', async () => {
      const mockImages = [];
      prisma.portfolio.findMany.mockResolvedValue(mockImages);

      const response = await request(app)
        .get('/api/upload/supplier/supplier1');

      expect(response.status).toBe(200);
      expect(prisma.portfolio.findMany).toHaveBeenCalled();
      expect(prisma.portfolio.findUnique).not.toHaveBeenCalled();
    });
  });
});