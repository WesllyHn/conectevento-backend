const { PrismaClient } = require('@prisma/client');
const AppError = require('../utils/AppError');
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

class UserService {
  async getAllUsers() {
    const users = await prisma.user.findMany({
      include: {
        services: true,
        portfolio: true
      }
    });
    return users;
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
    
    return user;
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
    
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async createUser(userData) {
    try {
      const { services, portfolio, ...userMainData } = userData;
      const passwordHash = await bcrypt.hash(String(userData.password), 10);

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
      
      return user;
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
      return user;
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
        type: 'SUPPLIER'
      },
      include: {
        services: true,
        portfolio: true
      }
    });
    return users;
  }
}

module.exports = new UserService();