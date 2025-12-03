const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Token de acesso não fornecido', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
      throw new AppError('JWT_SECRET não configurado no servidor', 500);
    }
    const decoded = jwt.verify(token, secret);

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expirado', 401));
    }
    next(error);
  }
};

const requireUserType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Usuário não autenticado', 401));
    }

    if (!allowedTypes.includes(req.user.type)) {
      return next(new AppError('Acesso negado. Tipo de usuário não autorizado', 403));
    }

    next();
  };
};

const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Usuário não autenticado', 401));
      }

      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (req.user.id !== resourceOwnerId) {
        return next(new AppError('Acesso negado. Você não tem permissão para acessar este recurso', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticateToken,
  requireUserType,
  requireOwnership
};

