const express = require('express');
const router = express.Router();
const { testConnection } = require('../database/connection');
const logger = require('../utils/logger');

// Health check endpoint
router.get('/', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'OK',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Test database connection
    await testConnection();
    healthCheck.database = 'connected';
    
    // Test memory usage
    const memoryUsage = process.memoryUsage();
    healthCheck.memory = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    healthCheck.status = 'ERROR';
    healthCheck.database = 'disconnected';
    healthCheck.error = error.message;
    
    res.status(503).json(healthCheck);
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const detailed = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'OK',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodejs: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid
  };

  try {
    // Test database connection
    await testConnection();
    detailed.database = 'connected';
    
    // Memory usage
    const memoryUsage = process.memoryUsage();
    detailed.memory = {
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    };

    // CPU usage (basic)
    detailed.cpu = process.cpuUsage();

    res.status(200).json(detailed);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    detailed.status = 'ERROR';
    detailed.database = 'disconnected';
    detailed.error = error.message;
    
    res.status(503).json(detailed);
  }
});

module.exports = router;