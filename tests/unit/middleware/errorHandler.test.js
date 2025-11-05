// tests/unit/middleware/errorHandler.test.js
const errorHandler = require('../../../src/middleware/errorHandler');
const AppError = require('../../../src/utils/AppError');

describe('ErrorHandler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    // Mock console.error para não poluir os logs de teste
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('deve tratar erro AppError genérico', () => {
    const error = new AppError('Custom error', 400);

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Custom error',
      data: null
    });
  });

  test('deve tratar erro Prisma P2002 (duplicata)', () => {
    const error = {
      code: 'P2002',
      message: 'Unique constraint failed'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Duplicate field value',
      data: null
    });
  });

  test('deve tratar erro Prisma P2025 (registro não encontrado)', () => {
    const error = {
      code: 'P2025',
      message: 'Record to update not found'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Record not found',
      data: null
    });
  });

  test('deve tratar erro Prisma P2003 (relacionamento inválido)', () => {
    const error = {
      code: 'P2003',
      message: 'Foreign key constraint failed'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid relationship',
      data: null
    });
  });

  test('deve tratar erro Prisma desconhecido', () => {
    const error = {
      code: 'P9999',
      message: 'Unknown database error'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Database error: Unknown database error',
      data: null
    });
  });

  test('deve tratar erro de validação', () => {
    const error = {
      name: 'ValidationError',
      errors: {
        field1: { message: 'Field1 is required' },
        field2: { message: 'Field2 is invalid' }
      }
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Field1 is required, Field2 is invalid',
      data: null
    });
  });

  test('deve tratar erro de CastError', () => {
    const error = {
      name: 'CastError',
      message: 'Cast to ObjectId failed'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid resource ID',
      data: null
    });
  });

  test('deve tratar erro JWT inválido', () => {
    const error = {
      name: 'JsonWebTokenError',
      message: 'jwt malformed'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid token',
      data: null
    });
  });

  test('deve tratar erro JWT expirado', () => {
    const error = {
      name: 'TokenExpiredError',
      message: 'jwt expired'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token expired',
      data: null
    });
  });

  test('deve usar status 500 padrão para erros desconhecidos', () => {
    const error = new Error('Unknown error');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unknown error',
      data: null
    });
  });

  test('deve logar o erro no console', () => {
    const error = new Error('Test error');

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith(error);
  });
});