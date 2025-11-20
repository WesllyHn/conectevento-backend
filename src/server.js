const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

const userRoutes = require('./routes/user.routes');
const eventRoutes = require('./routes/event.routes');
const review = require('./routes/review.routes')
const budget = require('./routes/budget.routes')
const roadmap = require('./routes/roadmap.routes')
const uploadRoutes = require('./routes/upload.routes')

require('dotenv').config();
app.use(cors({
  origin: [
    'http://localhost:5173/',
    'http://localhost:4173/',
    'https://conectevento.hendlerweslly08.workers.dev/',
    'https://main.delt32gvbuhjm.amplifyapp.com/'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
}));


// Outros middlewares
// já tinha, apenas confirme:
app.use(express.json({ limit: '20mb' })); // aumenta o limite
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reviews', review);
app.use('/api/budgets', budget);
app.use('/api/roadmaps', roadmap);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use(/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;