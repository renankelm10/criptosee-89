const express = require('express');
const router = express.Router();
const cryptoQueries = require('../database/queries');
const marketUpdater = require('../services/marketUpdater');
const logger = require('../utils/logger');

// GET /api/coins - Lista todas as moedas
router.get('/coins', async (req, res) => {
  try {
    const { search } = req.query;
    
    let coins;
    if (search) {
      coins = await cryptoQueries.searchCoins(search);
    } else {
      coins = await cryptoQueries.getAllCoins();
    }
    
    res.json({ data: coins, count: coins.length });
  } catch (error) {
    logger.error('Error fetching coins:', error);
    res.status(500).json({ error: 'Failed to fetch coins' });
  }
});

// GET /api/coins/:id - Detalhes de uma moeda específica
router.get('/coins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const coin = await cryptoQueries.getCoinById(id);
    
    if (!coin) {
      return res.status(404).json({ error: 'Coin not found' });
    }
    
    res.json({ data: coin });
  } catch (error) {
    logger.error('Error fetching coin:', error);
    res.status(500).json({ error: 'Failed to fetch coin' });
  }
});

// GET /api/markets - Dados atuais do mercado (com paginação)
router.get('/markets', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 250);
    
    const markets = await cryptoQueries.getLatestMarkets(page, limit);
    
    res.json({ 
      data: markets, 
      count: markets.length,
      page,
      limit
    });
  } catch (error) {
    logger.error('Error fetching markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// GET /api/markets/history/:coinId - Histórico de preços de uma moeda
router.get('/markets/history/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    
    const history = await cryptoQueries.getMarketHistory(coinId, limit);
    
    res.json({ 
      data: history, 
      count: history.length,
      coin_id: coinId
    });
  } catch (error) {
    logger.error('Error fetching market history:', error);
    res.status(500).json({ error: 'Failed to fetch market history' });
  }
});

// GET /api/global - Dados globais do mercado
router.get('/global', async (req, res) => {
  try {
    const globalData = await cryptoQueries.getGlobalMarketData();
    const marketStats = await cryptoQueries.getMarketStats();
    
    res.json({ 
      data: {
        ...globalData,
        ...marketStats
      }
    });
  } catch (error) {
    logger.error('Error fetching global data:', error);
    res.status(500).json({ error: 'Failed to fetch global data' });
  }
});

// GET /api/movers - Top gainers/losers
router.get('/movers', async (req, res) => {
  try {
    const { type = 'gainers' } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    const movers = await cryptoQueries.getTopMovers(type, limit);
    
    res.json({ 
      data: movers, 
      count: movers.length,
      type
    });
  } catch (error) {
    logger.error('Error fetching movers:', error);
    res.status(500).json({ error: 'Failed to fetch movers' });
  }
});

// POST /api/refresh-markets - Atualizar dados do mercado (equivalente à Edge Function)
router.post('/refresh-markets', async (req, res) => {
  try {
    const { pages = 2, per_page = 250 } = req.body;
    
    logger.info('Manual market refresh requested', { pages, per_page });
    
    const result = await marketUpdater.updateMarkets(pages, per_page);
    
    res.json({ 
      success: true,
      ...result,
      message: 'Markets updated successfully'
    });
  } catch (error) {
    logger.error('Error refreshing markets:', error);
    res.status(500).json({ 
      error: 'Failed to refresh markets',
      message: error.message
    });
  }
});

// GET /api/stats - Estatísticas do mercado
router.get('/stats', async (req, res) => {
  try {
    const stats = await cryptoQueries.getMarketStats();
    
    res.json({ data: stats });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;