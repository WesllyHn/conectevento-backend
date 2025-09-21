// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');

router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.post('/', eventController.createEvent);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);
router.get('/organizer/:organizerId', eventController.getEventsByOrganizer);
router.get('/type/:type', eventController.getEventsByType);

module.exports = router;