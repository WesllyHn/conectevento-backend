const express = require('express');
const router = express.Router();
const roadmapController = require('../controllers/roadmap.controller');

router.get('/:id', roadmapController.getRoadmap);
router.get('/eventId/:idEvent', roadmapController.get);
router.post('/', roadmapController.create);
router.put('/:id', roadmapController.update);
router.delete('/:id', roadmapController.delete);


module.exports = router;