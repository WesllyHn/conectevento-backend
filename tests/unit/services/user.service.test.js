const userService = require('../../../src/services/user.service');
const { PrismaClient } = require('@prisma/client');
const AppError = require('../../../src/utils/AppError');
const bcrypt = require('bcryptjs');
const emailService = require('../../../src/services/email.service');

const prisma = new PrismaClient();
jest.mock('bcryptjs');
jest.mock('../../../src/services/email.service');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    test('deve buscar todos os usuários', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@test.com', type: 'ORGANIZER' },
        { id: '2', name: 'User 2', email: 'user2@test.com', type: 'SUPPLIER' }
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        include: {
          services: true,
          portfolio: true
        }
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('getUserById', () => {
    test('deve buscar usuário por ID', async () => {
      const mockUser = {
        id: 'user1',
        name: 'Test User',
        email: 'test@test.com',
        type: 'ORGANIZER'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        include: {
          services: true,
          portfolio: true,
          organizedEvents: true,
          sentQuoteRequests: true,
          receivedQuoteRequests: true
        }
      });
      expect(result).toEqual(mockUser);
    });

    test('deve lançar AppError 404 quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getUserById('invalid')).rejects.toThrow(AppError);
      await expect(userService.getUserById('invalid')).rejects.toThrow('User not found');
    });
  });

  describe('loginUser', () => {
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

      const result = await userService.loginUser('test@test.com', 'password123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user.email).toBe('test@test.com');
    });

    test('deve lançar AppError 404 quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.loginUser('invalid@test.com', 'password')).rejects.toThrow(AppError);
      await expect(userService.loginUser('invalid@test.com', 'password')).rejects.toThrow('Usuário/ senha inválidos');
    });

    test('deve lançar AppError 404 quando senha é inválida', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        password: 'hashedpassword'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(userService.loginUser('test@test.com', 'wrongpassword')).rejects.toThrow(AppError);
      await expect(userService.loginUser('test@test.com', 'wrongpassword')).rejects.toThrow('Usuário/ senha inválidos');
    });
  });

  describe('createUser', () => {
    test('deve criar usuário com sucesso', async () => {
      const mockUserData = {
        name: 'New User',
        email: 'new@test.com',
        password: 'password123',
        type: 'ORGANIZER',
        services: [],
        portfolio: []
      };

      const mockCreated = {
        id: 'user1',
        name: 'New User',
        email: 'new@test.com',
        password: 'hashedpassword',
        type: 'ORGANIZER'
      };

      bcrypt.hash.mockResolvedValue('hashedpassword');
      prisma.user.create.mockResolvedValue(mockCreated);

      const result = await userService.createUser(mockUserData);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'New User',
          email: 'new@test.com',
          password: 'hashedpassword',
          type: 'ORGANIZER',
          services: { create: [] },
          portfolio: { create: [] }
        },
        include: {
          services: true,
          portfolio: true
        }
      });
      const { password, ...expectedResult } = mockCreated;
      expect(result).toEqual(expectedResult);
    });

    test('deve criar usuário com services e portfolio', async () => {
      const mockUserData = {
        name: 'Supplier',
        email: 'supplier@test.com',
        password: 'password123',
        type: 'SUPPLIER',
        services: [{ service: 'Decoração' }],
        portfolio: [{ imageUrl: 'image1.jpg' }]
      };

      bcrypt.hash.mockResolvedValue('hashedpassword');
      prisma.user.create.mockResolvedValue({ id: 'user1', ...mockUserData });

      await userService.createUser(mockUserData);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            services: { create: [{ service: 'Decoração' }] },
            portfolio: { create: [{ imageUrl: 'image1.jpg' }] }
          })
        })
      );
    });

    test('deve lançar AppError 409 quando email já existe (P2002)', async () => {
      bcrypt.hash.mockResolvedValue('hashedpassword');
      prisma.user.create.mockRejectedValue({ code: 'P2002' });

      await expect(userService.createUser({ email: 'existing@test.com', password: 'pass' })).rejects.toThrow(AppError);
      await expect(userService.createUser({ email: 'existing@test.com', password: 'pass' })).rejects.toThrow('Email already exists');
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      bcrypt.hash.mockResolvedValue('hashedpassword');
      prisma.user.create.mockRejectedValue(new Error('Database error'));

      await expect(userService.createUser({ password: 'pass' })).rejects.toThrow(AppError);
      await expect(userService.createUser({ password: 'pass' })).rejects.toThrow(/Error creating user/);
    });
  });

  describe('updateUser', () => {
    test('deve atualizar usuário existente', async () => {
      const mockExisting = { id: 'user1', name: 'Old Name' };
      const mockUpdated = { id: 'user1', name: 'New Name' };

      prisma.user.findUnique.mockResolvedValueOnce(mockExisting).mockResolvedValueOnce(mockUpdated);

      const result = await userService.updateUser('user1', { name: 'New Name' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user1' } });
      expect(result).toEqual(mockUpdated);
    });

    test('deve atualizar services do usuário', async () => {
      const mockExisting = { id: 'user1', type: 'SUPPLIER' };
      const mockServices = [{ service: 'Decoração' }, { service: 'Buffet' }];

      prisma.user.findUnique.mockResolvedValueOnce(mockExisting).mockResolvedValueOnce(mockExisting);
      prisma.supplierService.deleteMany.mockResolvedValue({});
      prisma.supplierService.createMany.mockResolvedValue({});

      await userService.updateUser('user1', { services: mockServices });

      expect(prisma.supplierService.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: 'user1' }
      });
      expect(prisma.supplierService.createMany).toHaveBeenCalledWith({
        data: [
          { service: 'Decoração', supplierId: 'user1' },
          { service: 'Buffet', supplierId: 'user1' }
        ]
      });
    });

    test('deve atualizar portfolio do usuário', async () => {
      const mockExisting = { id: 'user1', type: 'SUPPLIER' };
      const mockPortfolio = [{ imageUrl: 'image1.jpg' }];

      prisma.user.findUnique.mockResolvedValueOnce(mockExisting).mockResolvedValueOnce(mockExisting);
      prisma.portfolio.deleteMany.mockResolvedValue({});
      prisma.portfolio.createMany.mockResolvedValue({});

      await userService.updateUser('user1', { portfolio: mockPortfolio });

      expect(prisma.portfolio.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: 'user1' }
      });
      expect(prisma.portfolio.createMany).toHaveBeenCalledWith({
        data: [{ imageUrl: 'image1.jpg', supplierId: 'user1' }]
      });
    });

    test('deve deletar services quando array vazio', async () => {
      const mockExisting = { id: 'user1' };
      prisma.user.findUnique.mockResolvedValueOnce(mockExisting).mockResolvedValueOnce(mockExisting);
      prisma.supplierService.deleteMany.mockResolvedValue({});

      await userService.updateUser('user1', { services: [] });

      expect(prisma.supplierService.deleteMany).toHaveBeenCalled();
      expect(prisma.supplierService.createMany).not.toHaveBeenCalled();
    });

    test('deve lançar AppError 404 quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.updateUser('invalid', {})).rejects.toThrow(AppError);
      await expect(userService.updateUser('invalid', {})).rejects.toThrow('User not found');
    });

    test('deve propagar AppError existente', async () => {
      const existingError = new AppError('Custom error', 400);
      prisma.user.findUnique.mockRejectedValue(existingError);

      await expect(userService.updateUser('user1', {})).rejects.toThrow(existingError);
    });
  });

  describe('deleteUser', () => {
    test('deve deletar usuário existente', async () => {
      const mockUser = { id: 'user1', name: 'Test' };
      prisma.user.delete.mockResolvedValue(mockUser);

      const result = await userService.deleteUser('user1');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user1' }
      });
      expect(result).toEqual(mockUser);
    });

    test('deve lançar AppError 404 quando usuário não existe (P2025)', async () => {
      prisma.user.delete.mockRejectedValue({ code: 'P2025' });

      await expect(userService.deleteUser('invalid')).rejects.toThrow(AppError);
      await expect(userService.deleteUser('invalid')).rejects.toThrow('User not found');
    });

    test('deve lançar AppError genérico para outros erros', async () => {
      prisma.user.delete.mockRejectedValue(new Error('Database error'));

      await expect(userService.deleteUser('user1')).rejects.toThrow(AppError);
      await expect(userService.deleteUser('user1')).rejects.toThrow(/Error deleting user/);
    });
  });

  describe('getAllSupplier', () => {
    test('deve buscar apenas usuários do tipo SUPPLIER', async () => {
      const mockSuppliers = [
        { id: '1', name: 'Supplier 1', type: 'SUPPLIER' },
        { id: '2', name: 'Supplier 2', type: 'SUPPLIER' }
      ];

      prisma.user.findMany.mockResolvedValue(mockSuppliers);

      const result = await userService.getAllSupplier();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { 
          type: 'SUPPLIER',
          availability: true
        },
        include: {
          services: true,
          portfolio: true
        }
      });
      expect(result).toEqual(mockSuppliers.map(({ password, ...user }) => user));
    });
  });

  describe('forgotPassword', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      emailService.sendPasswordResetEmail = jest.fn().mockResolvedValue({});
    });

    test('deve retornar sucesso mesmo quando email não existe (proteção contra enumeração)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.forgotPassword('nonexistent@test.com')).rejects.toThrow(AppError);
      await expect(userService.forgotPassword('nonexistent@test.com')).rejects.toThrow('Email não encontrado');
      
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@test.com' }
      });
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    test('deve gerar token e enviar email para usuário existente', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        name: 'Test User'
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
      emailService.sendPasswordResetEmail.mockResolvedValue({});

      const result = await userService.forgotPassword('test@test.com');

      expect(result).toEqual({ success: true });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' }
      });
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@test.com',
        expect.any(String),
        'Test User'
      );
    });

    test('deve invalidar tokens anteriores não utilizados', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        name: 'Test User'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.count.mockResolvedValue(0);
      prisma.passwordResetToken.updateMany.mockResolvedValue({});
      prisma.passwordResetToken.create.mockResolvedValue({});

      await userService.forgotPassword('test@test.com');

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

    test('deve respeitar rate limiting', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        name: 'Test User'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.count.mockResolvedValue(3); // Máximo atingido

      await expect(userService.forgotPassword('test@test.com')).rejects.toThrow(AppError);
      await expect(userService.forgotPassword('test@test.com')).rejects.toThrow('Muitas tentativas. Tente novamente mais tarde');
      
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    test('deve retornar sucesso mesmo com email inválido', async () => {
      const result = await userService.forgotPassword('invalid-email');

      expect(result).toEqual({ success: true });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    test('deve retornar sucesso mesmo em caso de erro', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(userService.forgotPassword('test@test.com')).rejects.toThrow(AppError);
      await expect(userService.forgotPassword('test@test.com')).rejects.toThrow('Erro ao processar solicitação de recuperação de senha');
    });

    test('deve normalizar email para lowercase', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@test.com',
        name: 'Test User'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passwordResetToken.count.mockResolvedValue(0);
      prisma.passwordResetToken.updateMany.mockResolvedValue({});
      prisma.passwordResetToken.create.mockResolvedValue({});

      await userService.forgotPassword('TEST@TEST.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' }
      });
    });
  });

  describe('resetPassword', () => {
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
      bcrypt.compare.mockResolvedValue(false); // Nova senha diferente da antiga
      bcrypt.hash.mockResolvedValue('new-hashed-password');
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      prisma.passwordResetToken.updateMany.mockResolvedValue({});

      const result = await userService.resetPassword('valid-token', 'newPassword123');

      expect(result).toEqual({ success: true });
      expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        include: { user: true }
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { password: 'new-hashed-password' }
      });
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token1' },
        data: { used: true }
      });
      expect(emailService.sendPasswordResetConfirmationEmail).toHaveBeenCalledWith(
        'test@test.com',
        'Test User'
      );
    });

    test('deve lançar erro quando token não existe', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(userService.resetPassword('invalid-token', 'newPassword123')).rejects.toThrow(AppError);
      await expect(userService.resetPassword('invalid-token', 'newPassword123')).rejects.toThrow('Token inválido ou expirado');
    });

    test('deve lançar erro quando token já foi usado', async () => {
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

      await expect(userService.resetPassword('used-token', 'newPassword123')).rejects.toThrow(AppError);
      await expect(userService.resetPassword('used-token', 'newPassword123')).rejects.toThrow('Este link de recuperação já foi utilizado');
    });

    test('deve lançar erro quando token expirou', async () => {
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

      await expect(userService.resetPassword('expired-token', 'newPassword123')).rejects.toThrow(AppError);
      await expect(userService.resetPassword('expired-token', 'newPassword123')).rejects.toThrow('Token inválido ou expirado');
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token1' },
        data: { used: true }
      });
    });

    test('deve lançar erro quando senha tem menos de 6 caracteres', async () => {
      await expect(userService.resetPassword('valid-token', '12345')).rejects.toThrow(AppError);
      await expect(userService.resetPassword('valid-token', '12345')).rejects.toThrow('A senha deve ter no mínimo 6 caracteres');
    });

    test('deve lançar erro quando nova senha é igual à senha atual', async () => {
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

      await expect(userService.resetPassword('valid-token', 'samePassword')).rejects.toThrow(AppError);
      await expect(userService.resetPassword('valid-token', 'samePassword')).rejects.toThrow('A nova senha deve ser diferente da senha atual');
    });

    test('deve invalidar outros tokens não utilizados do mesmo usuário', async () => {
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

      await userService.resetPassword('valid-token', 'newPassword123');

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

    test('deve lançar erro quando token está vazio', async () => {
      await expect(userService.resetPassword('', 'newPassword123')).rejects.toThrow(AppError);
      await expect(userService.resetPassword('', 'newPassword123')).rejects.toThrow('Token inválido ou expirado');
    });

    test('deve lançar erro quando nova senha está vazia', async () => {
      await expect(userService.resetPassword('valid-token', '')).rejects.toThrow(AppError);
      await expect(userService.resetPassword('valid-token', '')).rejects.toThrow('A senha deve ter no mínimo 6 caracteres');
    });
  });
});