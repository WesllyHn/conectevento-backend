const jwt = require('jsonwebtoken');
const { authenticateToken, requireUserType, requireOwnership } = require('../../../src/middleware/auth.middleware');
const AppError = require('../../../src/utils/AppError');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {};
    next = jest.fn();
    process.env.JWT_SECRET = 'test-secret-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('authenticateToken', () => {
    test('deve autenticar token válido', () => {
      const mockDecoded = { id: 'user1', email: 'test@test.com', type: 'ORGANIZER' };
      req.headers['authorization'] = 'Bearer valid-token';
      jwt.verify.mockReturnValue(mockDecoded);

      authenticateToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
      expect(req.user).toEqual(mockDecoded);
      expect(next).toHaveBeenCalledWith();
    });

    test('deve retornar erro 401 quando token não é fornecido', () => {
      req.headers['authorization'] = undefined;

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Token de acesso não fornecido');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('deve retornar erro 401 quando header authorization está vazio', () => {
      req.headers['authorization'] = '';

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Token de acesso não fornecido');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('deve retornar erro 401 quando Bearer não está presente', () => {
      req.headers['authorization'] = 'invalid-token';

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Token de acesso não fornecido');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('deve retornar erro 500 quando JWT_SECRET não está configurado', () => {
      delete process.env.JWT_SECRET;
      req.headers['authorization'] = 'Bearer valid-token';

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('JWT_SECRET não configurado no servidor');
      expect(next.mock.calls[0][0].statusCode).toBe(500);
    });

    test('deve retornar erro 500 quando JWT_SECRET está vazio', () => {
      process.env.JWT_SECRET = '';
      req.headers['authorization'] = 'Bearer valid-token';

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('JWT_SECRET não configurado no servidor');
      expect(next.mock.calls[0][0].statusCode).toBe(500);
    });

    test('deve retornar erro 500 quando JWT_SECRET é apenas espaços', () => {
      process.env.JWT_SECRET = '   ';
      req.headers['authorization'] = 'Bearer valid-token';

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('JWT_SECRET não configurado no servidor');
      expect(next.mock.calls[0][0].statusCode).toBe(500);
    });

    test('deve retornar erro 401 quando token é inválido (JsonWebTokenError)', () => {
      req.headers['authorization'] = 'Bearer invalid-token';
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Token inválido');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('deve retornar erro 401 quando token está expirado (TokenExpiredError)', () => {
      req.headers['authorization'] = 'Bearer expired-token';
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Token expirado');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('deve passar outros erros para next', () => {
      req.headers['authorization'] = 'Bearer token';
      const error = new Error('Other error');
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('requireUserType', () => {
    test('deve permitir acesso quando tipo de usuário está na lista permitida', () => {
      req.user = { id: 'user1', type: 'ORGANIZER' };
      const middleware = requireUserType('ORGANIZER', 'SUPPLIER');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('deve permitir acesso quando tipo SUPPLIER está permitido', () => {
      req.user = { id: 'user1', type: 'SUPPLIER' };
      const middleware = requireUserType('ORGANIZER', 'SUPPLIER');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('deve retornar erro 401 quando usuário não está autenticado', () => {
      req.user = undefined;
      const middleware = requireUserType('ORGANIZER');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Usuário não autenticado');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('deve retornar erro 403 quando tipo de usuário não está autorizado', () => {
      req.user = { id: 'user1', type: 'SUPPLIER' };
      const middleware = requireUserType('ORGANIZER');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Acesso negado. Tipo de usuário não autorizado');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    test('deve retornar erro 403 quando tipo ORGANIZER não está autorizado', () => {
      req.user = { id: 'user1', type: 'ORGANIZER' };
      const middleware = requireUserType('SUPPLIER');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Acesso negado. Tipo de usuário não autorizado');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });

  describe('requireOwnership', () => {
    test('deve permitir acesso quando usuário é o dono do recurso', async () => {
      req.user = { id: 'user1' };
      const getResourceOwnerId = jest.fn().mockResolvedValue('user1');
      const middleware = requireOwnership(getResourceOwnerId);

      await middleware(req, res, next);

      expect(getResourceOwnerId).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalledWith();
    });

    test('deve retornar erro 401 quando usuário não está autenticado', async () => {
      req.user = undefined;
      const getResourceOwnerId = jest.fn().mockResolvedValue('user1');
      const middleware = requireOwnership(getResourceOwnerId);

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Usuário não autenticado');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('deve retornar erro 403 quando usuário não é o dono do recurso', async () => {
      req.user = { id: 'user1' };
      const getResourceOwnerId = jest.fn().mockResolvedValue('user2');
      const middleware = requireOwnership(getResourceOwnerId);

      await middleware(req, res, next);

      expect(getResourceOwnerId).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Acesso negado. Você não tem permissão para acessar este recurso');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    test('deve passar erro para next quando getResourceOwnerId lança erro', async () => {
      req.user = { id: 'user1' };
      const error = new Error('Database error');
      const getResourceOwnerId = jest.fn().mockRejectedValue(error);
      const middleware = requireOwnership(getResourceOwnerId);

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

