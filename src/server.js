const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');


const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de CORS
// const corsOptions = {
//   origin: function (origin, callback) {
//     // Em desenvolvimento, permite localhost e requests sem origin
//     if (process.env.NODE_ENV !== 'production') {
//       return callback(null, true);
//     }
    
//     // Em produção, apenas origens específicas
//     // const allowedOrigins = [
//     //   'https://seu-dominio.com',
//     //   'https://www.seu-dominio.com',
//     //   'https://app.seu-dominio.com'
//     // ];
    
//     // if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//     //   callback(null, true);
//     // } else {
//     //   callback(new Error('Not allowed by CORS'));
//     // }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// };

const userRoutes = require('./routes/user.routes');
const eventRoutes = require('./routes/event.routes');

require('dotenv').config();
app.use(cors());


// Outros middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);

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