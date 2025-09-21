const AppError = require('../utils/AppError');
const { errorResponse } = require('./responseHandler');

const handlePrismaError = (err) => {
  switch (err.code) {
    case 'P2002':
      return new AppError('Duplicate field value', 400);
    case 'P2025':
      return new AppError('Record not found', 404);
    case 'P2003':
      return new AppError('Invalid relationship', 400);
    default:
      return new AppError(`Database error: ${err.message}`, 400);
  }
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log para desenvolvimento
  console.error(err);

  // Erro do Prisma
  if (err.code && err.code.startsWith('P')) {
    error = handlePrismaError(err);
  }

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // Erro de cast do Mongoose
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID';
    error = new AppError(message, 400);
  }

  // Erro JWT
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }

  // JWT expirado
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  errorResponse(res, error.message || 'Server Error', error.statusCode || 500);
};

module.exports = errorHandler;