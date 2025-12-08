const userService = require('../services/user.service');
const { successResponse, errorResponse } = require('../middleware/responseHandler');

class UserController {
  async getUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers();
      successResponse(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      successResponse(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  async loginUser(req, res, next) {
    try {
      const email = req.query.email;
      const passWord = req.query.password;
      const loginResult = await userService.loginUser(email, passWord);
      
      if (!loginResult || !loginResult.user || !loginResult.token) {
        throw new Error('Erro ao processar login: resultado inválido');
      }
      
      successResponse(res, loginResult, 'login successfully');
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const userData = req.body;

      const newUser = await userService.createUser(userData);
      successResponse(res, newUser, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const userData = req.body;
      const updatedUser = await userService.updateUser(id, userData);
      successResponse(res, updatedUser, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);
      successResponse(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
   async getSupplier(req, res, next) {
    try {
      const users = await userService.getAllSupplier();
      successResponse(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório',
          data: null
        });
      }

      await userService.forgotPassword(email);
      
      successResponse(res, null, 'Email de recuperação enviado com sucesso');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token é obrigatório',
          data: null
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Nova senha é obrigatória',
          data: null
        });
      }

      await userService.resetPassword(token, newPassword);
      
      successResponse(res, null, 'Senha redefinida com sucesso');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();