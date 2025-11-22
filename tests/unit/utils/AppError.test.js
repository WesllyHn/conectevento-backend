const AppError = require('../../../src/utils/AppError');

describe('AppError', () => {
  test('deve criar um erro com mensagem e statusCode', () => {
    const error = new AppError('Test error', 404);
    
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  test('deve definir status como "fail" para erros 4xx', () => {
    const error = new AppError('Client error', 400);
    
    expect(error.status).toBe('fail');
  });

  test('deve definir status como "error" para erros 5xx', () => {
    const error = new AppError('Server error', 500);
    
    expect(error.status).toBe('error');
  });

  test('deve permitir definir isOperational como false', () => {
    const error = new AppError('Programming error', 500, false);
    
    expect(error.isOperational).toBe(false);
  });

  test('deve capturar stack trace', () => {
    const error = new AppError('Test error', 500);
    
    expect(error.stack).toBeDefined();
  });

  test('deve ser uma instância de Error', () => {
    const error = new AppError('Test error', 500);
    
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });
});