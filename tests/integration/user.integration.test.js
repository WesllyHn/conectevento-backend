const request = require('supertest');
const express = require('express');
const userRoutes = require('../../src/routes/user.routes');
const errorHandler = require('../../src/middleware/errorHandler');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
jest.mock('bcryptjs');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  app.use(errorHandler);
  return app;
};

describe('User Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    test('deve retornar todos os usuários', async () => {
      const mockUsers = [
        {
          id: 'user1',
          name: 'User 1',
          email: 'user1@test.com',
          type: 'ORGANIZER',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'user2',
          name: 'User 2',
          email: 'user2@test.com',
          type: 'SUPPLIER',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.message).toBe('Users retrieved successfully');
    });
  });

  describe('GET /api/users/userId/:id', () => {
    test('deve retornar usuário por ID', async () => {
      const mockUser = {
        id: 'user1',
        name: 'Test User',
        email: 'test@test.com',
        type: 'ORGANIZER',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app).get('/api/users/userId/user1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User retrieved successfully');
    });

    test('deve retornar erro 404 quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/users/userId/invalid');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('GET /api/users/login', () => {
    test('deve fazer login com credenciais válidas', async () => {
      const mockUser = {
        id: 'user1',
        name: 'Test User',
        email: 'test@test.com',
        password: 'hashedpassword',
        type: 'ORGANIZER'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/users/login')
        .query({ email: 'test@test.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.message).toBe('login successfully');
    });

    test('deve retornar erro 404 para credenciais inválidas', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/login')
        .query({ email: 'invalid@test.com', password: 'password' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Usuário/ senha inválidos');
    });

    test('deve retornar erro 404 para senha incorreta', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        password: 'hashedpassword'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/users/login')
        .query({ email: 'test@test.com', password: 'wrongpassword' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Usuário/ senha inválidos');
    });
  });

  describe('POST /api/users', () => {
    test('deve criar novo usuário', async () => {
      const newUser = {
        name: 'New User',
        email: 'new@test.com',
        password: 'password123',
        type: 'ORGANIZER'
      };

      const mockCreated = {
        id: 'user1',
        name: 'New User',
        email: 'new@test.com',
        password: 'hashedpassword',
        type: 'ORGANIZER',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      bcrypt.hash.mockResolvedValue('hashedpassword');
      prisma.user.create.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/users')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    test('deve retornar erro 409 quando email já existe (P2002)', async () => {
      bcrypt.hash.mockResolvedValue('hashedpassword');
      prisma.user.create.mockRejectedValue({ code: 'P2002' });

      const response = await request(app)
        .post('/api/users')
        .send({ email: 'existing@test.com', password: 'pass' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already exists');
    });
  });

  describe('PUT /api/users/:id', () => {
    test('deve atualizar usuário existente', async () => {
      const mockExisting = { id: 'user1', name: 'Old Name' };
      const mockUpdated = { id: 'user1', name: 'New Name', updatedAt: new Date() };

      prisma.user.findUnique.mockResolvedValue(mockExisting);
      prisma.user.update.mockResolvedValue(mockUpdated);
      prisma.user.findUnique.mockResolvedValueOnce(mockExisting).mockResolvedValueOnce(mockUpdated);

      const response = await request(app)
        .put('/api/users/user1')
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User updated successfully');
    });

    test('deve atualizar services do usuário', async () => {
      const mockExisting = { id: 'user1', type: 'SUPPLIER' };
      const mockServices = [{ service: 'Decoração' }];

      prisma.user.findUnique.mockResolvedValue(mockExisting);
      prisma.user.update.mockResolvedValue(mockExisting);
      prisma.supplierService.deleteMany.mockResolvedValue({});
      prisma.supplierService.createMany.mockResolvedValue({});

      const response = await request(app)
        .put('/api/users/user1')
        .send({ services: mockServices });

      expect(response.status).toBe(200);
      expect(prisma.supplierService.deleteMany).toHaveBeenCalled();
      expect(prisma.supplierService.createMany).toHaveBeenCalled();
    });

    test('deve retornar erro 404 quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/invalid')
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('deve deletar usuário existente', async () => {
      const mockUser = { id: 'user1', name: 'Test' };
      prisma.user.delete.mockResolvedValue(mockUser);

      const response = await request(app).delete('/api/users/user1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
      expect(response.body.message).toBe('User deleted successfully');
    });

    test('deve retornar erro 404 quando usuário não existe (P2025)', async () => {
      prisma.user.delete.mockRejectedValue({ code: 'P2025' });

      const response = await request(app).delete('/api/users/invalid');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('GET /api/users/supplier', () => {
    test('deve retornar apenas suppliers', async () => {
      const mockSuppliers = [
        {
          id: 'user1',
          name: 'Supplier 1',
          type: 'SUPPLIER',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'user2',
          name: 'Supplier 2',
          type: 'SUPPLIER',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      prisma.user.findMany.mockResolvedValue(mockSuppliers);

      const response = await request(app).get('/api/users/supplier');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.message).toBe('Users retrieved successfully');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'SUPPLIER' }
        })
      );
    });
  });

  describe('Validação de UserType', () => {
    test('deve aceitar tipos válidos do enum UserType', async () => {
      const validTypes = ['ORGANIZER', 'SUPPLIER'];

      for (const type of validTypes) {
        bcrypt.hash.mockResolvedValue('hashedpassword');
        prisma.user.create.mockResolvedValue({
          id: 'user1',
          type,
          email: 'test@test.com'
        });

        const response = await request(app)
          .post('/api/users')
          .send({ email: 'test@test.com', password: 'pass', type });

        expect(response.status).toBe(201);
      }
    });
  });
});