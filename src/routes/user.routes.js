const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

router.get('/', userController.getUsers);
router.get('/userId/:id', userController.getUserById);
router.get('/login', userController.loginUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.get('/supplier', userController.getSupplier);//SUPPLIER

module.exports = router;