const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/:id', authenticateToken, budgetController.getBudget);
router.get('/', authenticateToken, budgetController.budget);
router.post('/', authenticateToken, budgetController.create);
router.put('/:id', authenticateToken, budgetController.update);
router.delete('/:id', authenticateToken, budgetController.delete);

module.exports = router;