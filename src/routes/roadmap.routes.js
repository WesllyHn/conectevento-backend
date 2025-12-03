const express = require('express');
const router = express.Router();
const roadmapController = require('../controllers/roadmap.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/:id', roadmapController.getRoadmap);
router.get('/eventId/:idEvent', roadmapController.get);

router.post('/', authenticateToken, roadmapController.create);
router.put('/:id', authenticateToken, roadmapController.update);
router.delete('/:id', authenticateToken, roadmapController.delete);

module.exports = router;