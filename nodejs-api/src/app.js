const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cron = require('node-cron');
require('dotenv').config();

const { connectDB, testConnection } = require('./database/connection');
const logger = require('./utils/logger');
const marketsRouter = require('./routes/markets');
const healthRouter = require('./routes/health');
const marketUpdater = require('./services/marketUpdater');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    /\.lovableproject\.com$/
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRouter);
app.use('/api', marketsRouter);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Cron job para atualizar mercados (equivalente à Edge Function)
// Executa a cada 30 segundos (mesmo intervalo do Supabase)
cron.schedule('*/30 * * * * *', async () => {
  try {
    logger.info('Iniciando atualização automática dos mercados...');
    await marketUpdater.updateMarkets();
    logger.info('Atualização automática concluída com sucesso');
  } catch (error) {
    logger.error('Erro na atualização automática:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    logger.info('Database connection successful');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Crypto API running on port ${PORT}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`📊 Markets API: http://localhost:${PORT}/api/markets`);
      logger.info('⏰ Cron job configured for market updates every 30 seconds');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;