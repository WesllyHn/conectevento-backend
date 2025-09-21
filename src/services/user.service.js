const { PrismaClient } = require('@prisma/client');
const AppError = require('../utils/AppError');
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

class UserService {
  // Get all users
  async getAllUsers() {
    const users = await prisma.user.findMany({
      include: {
        services: true,
        portfolio: true
      }
    });
    return users;
  }

  // Get user by ID
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

  // Create new user
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

  // Update user
  async updateUser(id, userData) {
    try {
      const { services, portfolio, ...userMainData } = userData;
      
      // Verifica se o usuário existe
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }
      
      // Atualiza os dados principais
      const user = await prisma.user.update({
        where: { id },
        data: userMainData
      });
      
      // Atualiza serviços se fornecidos
      if (services !== undefined) {
        await prisma.supplierService.deleteMany({ where: { supplierId: id } });
        if (services.length > 0) {
          await prisma.supplierService.createMany({
            data: services.map(service => ({
              service,
              supplierId: id
            }))
          });
        }
      }
      
      // Atualiza portfolio se fornecido
      if (portfolio !== undefined) {
        await prisma.portfolio.deleteMany({ where: { supplierId: id } });
        if (portfolio.length > 0) {
          await prisma.portfolio.createMany({
            data: portfolio.map(imageUrl => ({
              imageUrl,
              supplierId: id
            }))
          });
        }
      }
      
      // Retorna o usuário atualizado com relações
      return await this.getUserById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error updating user: ${error.message}`, 400);
    }
  }

  // Delete user
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

  // Get all Supplier
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