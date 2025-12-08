const { PrismaClient } = require('@prisma/client');
const AppError = require('../utils/AppError');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('./email.service');

const prisma = new PrismaClient();

class UserService {
  async getAllUsers() {
    const users = await prisma.user.findMany({
      include: {
        services: true,
        portfolio: true
      }
    });
    return users.map(({ password, ...user }) => user);
  }

  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        services: true,
        portfolio: true,
        organizedEvents: true,
        sentQuoteRequests: true,
        receivedQuoteRequests: true
      }
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  async loginUser(email, passWord) {
    const user = await prisma.user.findUnique({
      where: {email: email },
    });
    
    if (!user) {
      throw new AppError('Usuário/ senha inválidos', 404);
    }
    const validate = await bcrypt.compare(passWord, user.password)
    
    if(!validate) throw new AppError('Usuário/ senha inválidos', 404)
    
    // Valida se JWT_SECRET está configurado
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
      throw new AppError('JWT_SECRET não configurado. Configure a variável de ambiente JWT_SECRET.', 500);
    }
    
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    let token;
    try {
      token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          type: user.type,
          name: user.name
        },
        secret,
        { expiresIn }
      );
    } catch (error) {
      console.error('Erro ao gerar token JWT:', error.message);
      throw new AppError('Erro ao gerar token de autenticação', 500);
    }
    
    // Garantir que o token foi gerado
    if (!token) {
      throw new AppError('Erro ao gerar token de autenticação', 500);
    }
    
    const { password, ...safeUser } = user;
    
    const result = {
      user: safeUser,
      token
    };
    
    return result;
  }

  async createUser(userData) {
    try {
      const { services, portfolio, ...userMainData } = userData;
      const passwordHash = await bcrypt.hash(String(userData.password), 10);

      if (userMainData.type === 'SUPPLIER' && userMainData.availability === undefined) {
        userMainData.availability = false;
      }

      const user = await prisma.user.create({
        data: {
          ...userMainData,
          password: passwordHash,
          services: {
            create: services || []
          },
          portfolio: {
            create: portfolio || []
          }
        },
        include: {
          services: true,
          portfolio: true
        }
      });
      
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new AppError('Email already exists', 409);
      }
      throw new AppError(`Error creating user: ${error.message}`, 400);
    }
  }

  async updateUser(id, userData) {
    try {
      const { services, portfolio, ...userMainData } = userData;
      
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }
      
      if (userMainData.cnpjOrCpf === '') {
        userMainData.cnpjOrCpf = null;
      }
      
      if (Object.keys(userMainData).length > 0) {
        await prisma.user.update({
          where: { id },
          data: userMainData
        });
      }
      
      if (services !== undefined) {
        await prisma.supplierService.deleteMany({ where: { supplierId: id } });
        if (services.length > 0) {
        await prisma.supplierService.createMany({
          data: services.map(item => ({
            service: item.service,
            supplierId: id
          }))
        });
        }
      }
      
      if (portfolio !== undefined) {
        await prisma.portfolio.deleteMany({ where: { supplierId: id } });
        if (portfolio.length > 0) {
          await prisma.portfolio.createMany({
          data: portfolio.map(item => ({
            imageUrl: item.imageUrl,
            supplierId: id
          }))
        });
        }
      }
      
      return await this.getUserById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error updating user: ${error.message}`, 400);
    }
  }

  async deleteUser(id) {
    try {
      const user = await prisma.user.delete({
        where: { id }
      });
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new AppError('User not found', 404);
      }
      throw new AppError(`Error deleting user: ${error.message}`, 400);
    }
  }

    async getAllSupplier() {
    const users = await prisma.user.findMany({
      where: {
        type: 'SUPPLIER',
        availability: true,
      },
      include: {
        services: true,
        portfolio: true
      }
    });
    return users.map(({ password, ...user }) => user);
  }

  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async forgotPassword(email) {
    try {
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return { success: true };
      }

      const normalizedEmail = email.toLowerCase().trim();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (!user) {
        console.log(`Tentativa de recuperação de senha para email não cadastrado: ${normalizedEmail}`);
        return { success: true };
      }

      const maxAttempts = parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || '3');
      const windowHours = parseInt(process.env.PASSWORD_RESET_WINDOW_HOURS || '1');
      const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

      const recentTokens = await prisma.passwordResetToken.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: windowStart
          }
        }
      });

      if (recentTokens >= maxAttempts) {
        console.log(`Rate limit excedido para email: ${normalizedEmail}`);
        return { success: true };
      }

      await prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          used: false,
          expiresAt: {
            gt: new Date()
          }
        },
        data: {
          used: true
        }
      });

      const token = this.generateResetToken();
      const expiryHours = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1');
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      });

      try {
        await emailService.sendPasswordResetEmail(user.email, token, user.name);
      } catch (emailError) {
        console.error('Erro ao enviar email de recuperação:', emailError);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro em forgotPassword:', error);
      return { success: true };
    }
  }

  async resetPassword(token, newPassword) {
    try {
      if (!token || typeof token !== 'string' || token.trim() === '') {
        throw new AppError('Token inválido ou expirado', 400);
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        throw new AppError('A senha deve ter no mínimo 6 caracteres', 400);
      }

      const normalizedToken = token.trim();

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: normalizedToken },
        include: {
          user: true
        }
      });

      if (!resetToken) {
        throw new AppError('Token inválido ou expirado', 400);
      }

      if (resetToken.used) {
        throw new AppError('Este link de recuperação já foi utilizado', 400);
      }

      if (new Date() > resetToken.expiresAt) {
        await prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true }
        });
        throw new AppError('Token inválido ou expirado', 400);
      }

      const isSamePassword = await bcrypt.compare(newPassword, resetToken.user.password);
      if (isSamePassword) {
        throw new AppError('A nova senha deve ser diferente da senha atual', 400);
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: passwordHash }
      });

      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      });

      await prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          used: false,
          id: {
            not: resetToken.id
          }
        },
        data: {
          used: true
        }
      });

      try {
        await emailService.sendPasswordResetConfirmationEmail(
          resetToken.user.email,
          resetToken.user.name
        );
      } catch (emailError) {
        console.error('Erro ao enviar email de confirmação:', emailError);
      }
      return { success: true };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro em resetPassword:', error);
      throw new AppError('Erro ao redefinir senha', 400);
    }
  }
}

module.exports = new UserService();