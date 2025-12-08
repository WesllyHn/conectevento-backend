const request = require('supertest');
const express = require('express');
const userRoutes = require('../../src/routes/user.routes');
const errorHandler = require('../../src/middleware/errorHandler');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const emailService = require('../../src/services/email.service');

const prisma = new PrismaClient();
jest.mock('bcryptjs');
jest.mock('../../src/services/email.service');

// Mock do middleware de autenticação
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user1', type: 'ORGANIZER' };
    next();
  },
  requireUserType: jest.fn(),
  requireOwnership: jest.fn()
}));

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
          where: { 
            type: 'SUPPLIER',
            availability: true
          }
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

  describe('POST /api/users/forgot-password', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      emailService.sendPasswordResetEmail = jest.fn().mockResolvedValue({});
    });

    test('deve retornar sucesso quando email existe', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        name: 'Test User',
        type: 'ORGANIZER'
      };

      const mockToken = {
        id: 'token1',
        userId: 'user1',
        token: 'generated-token',
        expiresAt: new Date(),
        used: false
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.count.mockResolvedValue(0);
      prisma.passwordResetToken.updateMany.mockResolvedValue({});
      prisma.passwordResetToken.create.mockResolvedValue(mockToken);

      const response = await request(app)
        .post('/api/users/forgot-password')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email de recuperação enviado com sucesso');
      expect(response.body.data).toBe(null);
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    test('deve retornar sucesso mesmo quando email não existe (proteção contra enumeração)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/users/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email de recuperação enviado com sucesso');
    });

    test('deve retornar erro 400 quando email não é fornecido', async () => {
      const response = await request(app)
        .post('/api/users/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email é obrigatório');
    });

    test('deve respeitar rate limiting', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        name: 'Test User'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.count.mockResolvedValue(3); // Máximo atingido

      const response = await request(app)
        .post('/api/users/forgot-password')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    test('deve invalidar tokens anteriores ao gerar novo', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        name: 'Test User'
      };

      const mockToken = {
        id: 'token1',
        userId: 'user1',
        token: 'new-token',
        expiresAt: new Date(),
        used: false
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.count.mockResolvedValue(0);
      prisma.passwordResetToken.updateMany.mockResolvedValue({});
      prisma.passwordResetToken.create.mockResolvedValue(mockToken);

      await request(app)
        .post('/api/users/forgot-password')
        .send({ email: 'test@test.com' });

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          used: false,
          expiresAt: {
            gt: expect.any(Date)
          }
        },
        data: {
          used: true
        }
      });
    });
  });

  describe('POST /api/users/reset-password', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      emailService.sendPasswordResetConfirmationEmail = jest.fn().mockResolvedValue({});
    });

    test('deve redefinir senha com token válido', async () => {
      const mockToken = {
        id: 'token1',
        userId: 'user1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hora no futuro
        used: false,
        user: {
          id: 'user1',
          email: 'test@test.com',
          name: 'Test User',
          password: 'old-hashed-password'
        }
      };

      prisma.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      bcrypt.compare.mockResolvedValue(false); // Nova senha diferente
      bcrypt.hash.mockResolvedValue('new-hashed-password');
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      prisma.passwordResetToken.updateMany.mockResolvedValue({});

      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'valid-token',
          newPassword: 'newPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Senha redefinida com sucesso');
      expect(response.body.data).toBe(null);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(emailService.sendPasswordResetConfirmationEmail).toHaveBeenCalled();
    });

    test('deve retornar erro 400 quando token não existe', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newPassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token inválido ou expirado');
    });

    test('deve retornar erro 400 quando token já foi usado', async () => {
      const mockToken = {
        id: 'token1',
        userId: 'user1',
        token: 'used-token',
        expiresAt: new Date(Date.now() + 3600000),
        used: true,
        user: {
          id: 'user1',
          email: 'test@test.com',
          password: 'old-password'
        }
      };

      prisma.passwordResetToken.findUnique.mockResolvedValue(mockToken);

      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'used-token',
          newPassword: 'newPassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Este link de recuperação já foi utilizado');
    });

    test('deve retornar erro 400 quando token expirou', async () => {
      const mockToken = {
        id: 'token1',
        userId: 'user1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 3600000), // 1 hora no passado
        used: false,
        user: {
          id: 'user1',
          email: 'test@test.com',
          password: 'old-password'
        }
      };

      prisma.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      prisma.passwordResetToken.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'expired-token',
          newPassword: 'newPassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token inválido ou expirado');
    });

    test('deve retornar erro 400 quando senha tem menos de 6 caracteres', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'valid-token',
          newPassword: '12345'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('A senha deve ter no mínimo 6 caracteres');
    });

    test('deve retornar erro 400 quando nova senha é igual à senha atual', async () => {
      const mockToken = {
        id: 'token1',
        userId: 'user1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
        user: {
          id: 'user1',
          email: 'test@test.com',
          password: 'old-hashed-password'
        }
      };

      prisma.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      bcrypt.compare.mockResolvedValue(true); // Nova senha igual à antiga

      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'valid-token',
          newPassword: 'samePassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('A nova senha deve ser diferente da senha atual');
    });

    test('deve retornar erro 400 quando token não é fornecido', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          newPassword: 'newPassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token é obrigatório');
    });

    test('deve retornar erro 400 quando nova senha não é fornecida', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'valid-token'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Nova senha é obrigatória');
    });

    test('deve invalidar outros tokens do mesmo usuário após redefinição', async () => {
      const mockToken = {
        id: 'token1',
        userId: 'user1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
        user: {
          id: 'user1',
          email: 'test@test.com',
          name: 'Test User',
          password: 'old-hashed-password'
        }
      };

      prisma.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      bcrypt.compare.mockResolvedValue(false);
      bcrypt.hash.mockResolvedValue('new-hashed-password');
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      prisma.passwordResetToken.updateMany.mockResolvedValue({});

      await request(app)
        .post('/api/users/reset-password')
        .send({
          token: 'valid-token',
          newPassword: 'newPassword123'
        });

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          used: false,
          id: {
            not: 'token1'
          }
        },
        data: {
          used: true
        }
      });
    });
  });
});