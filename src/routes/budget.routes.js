// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');

router.get('/:id', budgetController.getBudget);
router.get('/', budgetController.budget)
router.post('/', budgetController.create);
router.put('/:id', budgetController.update);
router.delete('/:id', budgetController.delete);


module.exports = router;