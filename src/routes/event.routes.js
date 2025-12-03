const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.get('/type/:type', eventController.getEventsByType);

router.post('/', authenticateToken, eventController.createEvent);
router.put('/:id', authenticateToken, eventController.updateEvent);
router.delete('/:id', authenticateToken, eventController.deleteEvent);
router.get('/organizer/:organizerId', authenticateToken, eventController.getEventsByOrganizer);

module.exports = router;