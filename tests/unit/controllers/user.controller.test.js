const userController = require('../../../src/controllers/user.controller');
const userService = require('../../../src/services/user.service');
const { successResponse } = require('../../../src/middleware/responseHandler');

jest.mock('../../../src/services/user.service');
jest.mock('../../../src/middleware/responseHandler');

describe('UserController', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    test('deve buscar todos os usuários', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@test.com' },
        { id: '2', name: 'User 2', email: 'user2@test.com' }
      ];

      userService.getAllUsers.mockResolvedValue(mockUsers);

      await userController.getUsers(req, res, next);

      expect(userService.getAllUsers).toHaveBeenCalled();
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockUsers,
        'Users retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      userService.getAllUsers.mockRejectedValue(error);

      await userController.getUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    test('deve buscar usuário por ID', async () => {
      const mockUser = { id: 'user1', name: 'Test User' };
      req.params = { id: 'user1' };

      userService.getUserById.mockResolvedValue(mockUser);

      await userController.getUserById(req, res, next);

      expect(userService.getUserById).toHaveBeenCalledWith('user1');
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockUser,
        'User retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Not found');
      req.params = { id: 'invalid' };

      userService.getUserById.mockRejectedValue(error);

      await userController.getUserById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    test('deve fazer login com sucesso', async () => {
      const mockUser = { id: 'user1', name: 'Test', email: 'test@test.com' };
      req.query = { email: 'test@test.com', password: 'password123' };

      userService.loginUser.mockResolvedValue(mockUser);

      await userController.loginUser(req, res, next);

      expect(userService.loginUser).toHaveBeenCalledWith('test@test.com', 'password123');
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockUser,
        'login successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro quando credenciais inválidas', async () => {
      const error = new Error('Invalid credentials');
      req.query = { email: 'test@test.com', password: 'wrong' };

      userService.loginUser.mockRejectedValue(error);

      await userController.loginUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    test('deve criar usuário', async () => {
      const mockBody = {
        name: 'New User',
        email: 'new@test.com',
        password: 'password123',
        type: 'ORGANIZER'
      };
      const mockCreated = { id: 'user1', ...mockBody };

      req.body = mockBody;
      userService.createUser.mockResolvedValue(mockCreated);

      await userController.createUser(req, res, next);

      expect(userService.createUser).toHaveBeenCalledWith(mockBody);
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockCreated,
        'User created successfully',
        201
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.body = { name: 'Test' };

      userService.createUser.mockRejectedValue(error);

      await userController.createUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    test('deve atualizar usuário', async () => {
      const mockUpdated = { id: 'user1', name: 'Updated' };
      req.params = { id: 'user1' };
      req.body = { name: 'Updated' };

      userService.updateUser.mockResolvedValue(mockUpdated);

      await userController.updateUser(req, res, next);

      expect(userService.updateUser).toHaveBeenCalledWith('user1', { name: 'Updated' });
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockUpdated,
        'User updated successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.params = { id: 'user1' };
      req.body = { name: 'Test' };

      userService.updateUser.mockRejectedValue(error);

      await userController.updateUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    test('deve deletar usuário', async () => {
      req.params = { id: 'user1' };
      userService.deleteUser.mockResolvedValue({});

      await userController.deleteUser(req, res, next);

      expect(userService.deleteUser).toHaveBeenCalledWith('user1');
      expect(successResponse).toHaveBeenCalledWith(
        res,
        null,
        'User deleted successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      req.params = { id: 'user1' };

      userService.deleteUser.mockRejectedValue(error);

      await userController.deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });

  describe('getSupplier', () => {
    test('deve buscar apenas suppliers', async () => {
      const mockSuppliers = [
        { id: '1', name: 'Supplier 1', type: 'SUPPLIER' },
        { id: '2', name: 'Supplier 2', type: 'SUPPLIER' }
      ];

      userService.getAllSupplier.mockResolvedValue(mockSuppliers);

      await userController.getSupplier(req, res, next);

      expect(userService.getAllSupplier).toHaveBeenCalled();
      expect(successResponse).toHaveBeenCalledWith(
        res,
        mockSuppliers,
        'Users retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('deve chamar next com erro', async () => {
      const error = new Error('Error');
      userService.getAllSupplier.mockRejectedValue(error);

      await userController.getSupplier(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(successResponse).not.toHaveBeenCalled();
    });
  });
});