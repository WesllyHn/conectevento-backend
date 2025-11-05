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
      const passWord = req.query.password
      const user = await userService.loginUser(email, passWord);
      successResponse(res, user, 'login successfully');
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
}

module.exports = new UserController();