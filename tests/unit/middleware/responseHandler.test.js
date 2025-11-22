const { successResponse, errorResponse } = require('../../../src/middleware/responseHandler');

describe('ResponseHandler Middleware', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('successResponse', () => {
    test('deve retornar resposta de sucesso com status 200 padrão', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Success';

      successResponse(res, data, message);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });

    test('deve retornar resposta de sucesso com status customizado', () => {
      const data = { id: 1 };
      const message = 'Created';
      const statusCode = 201;

      successResponse(res, data, message, statusCode);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });

    test('deve usar mensagem padrão quando não fornecida', () => {
      const data = { id: 1 };

      successResponse(res, data);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data
      });
    });

    test('deve aceitar data como null', () => {
      successResponse(res, null, 'Deleted');

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Deleted',
        data: null
      });
    });
  });

  describe('errorResponse', () => {
    test('deve retornar resposta de erro com status 500 padrão', () => {
      const message = 'Error occurred';

      errorResponse(res, message);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        data: null
      });
    });

    test('deve retornar resposta de erro com status customizado', () => {
      const message = 'Not found';
      const statusCode = 404;

      errorResponse(res, message, statusCode);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        data: null
      });
    });
  });
});