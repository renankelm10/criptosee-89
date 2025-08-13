const axios = require('axios');
const logger = require('../utils/logger');

class CoinGeckoService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CriptoSee/1.0 (Node.js API)'
      }
    });

    // Add retry logic
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          logger.warn('Rate limit hit, waiting 60 seconds...');
          await this.sleep(60000);
          return this.client.request(error.config);
        }
        throw error;
      }
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch markets data (equivalente à Edge Function)
  async fetchMarkets(pages = 2, perPage = 250) {
    try {
      const allCoins = [];
      
      for (let page = 1; page <= pages; page++) {
        logger.info(`Fetching CoinGecko page ${page}/${pages}...`);
        
        const url = `/coins/markets`;
        const params = {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: Math.min(perPage, 250), // CoinGecko limit
          page,
          price_change_percentage: '1h,24h,7d',
          locale: 'en',
          precision: 'full'
        };

        const response = await this.client.get(url, { params });
        
        if (Array.isArray(response.data)) {
          allCoins.push(...response.data);
          logger.info(`Page ${page} fetched: ${response.data.length} coins`);
        } else {
          logger.warn(`Page ${page} returned invalid data`);
        }

        // Rate limiting: wait between requests
        if (page < pages) {
          await this.sleep(1000); // 1 second between requests
        }
      }

      logger.info(`Total coins fetched: ${allCoins.length}`);
      return allCoins;
    } catch (error) {
      logger.error('Error fetching markets from CoinGecko:', error.message);
      throw new Error(`CoinGecko fetch failed: ${error.message}`);
    }
  }

  // Transform CoinGecko data to our format
  transformCoinData(coin) {
    return {
      id: String(coin.id),
      symbol: String(coin.symbol || '').toUpperCase(),
      name: String(coin.name || ''),
      image: coin.image || null
    };
  }

  transformMarketData(coin) {
    return {
      coin_id: String(coin.id),
      price: this.toNumber(coin.current_price),
      market_cap: this.toNumber(coin.market_cap),
      market_cap_rank: Number.isFinite(coin.market_cap_rank) ? coin.market_cap_rank : null,
      volume_24h: this.toNumber(coin.total_volume),
      price_change_percentage_1h: this.toNumber(coin.price_change_percentage_1h_in_currency),
      price_change_percentage_24h: this.toNumber(coin.price_change_percentage_24h_in_currency),
      price_change_percentage_7d: this.toNumber(coin.price_change_percentage_7d_in_currency),
      circulating_supply: this.toNumber(coin.circulating_supply),
      total_supply: this.toNumber(coin.total_supply),
      max_supply: this.toNumber(coin.max_supply),
      ath: this.toNumber(coin.ath),
      ath_change_percentage: this.toNumber(coin.ath_change_percentage),
      ath_date: coin.ath_date ? new Date(coin.ath_date).toISOString() : null,
      atl: this.toNumber(coin.atl),
      atl_change_percentage: this.toNumber(coin.atl_change_percentage),
      atl_date: coin.atl_date ? new Date(coin.atl_date).toISOString() : null
    };
  }

  toNumber(value) {
    const num = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(num) ? Number(num) : null;
  }

  // Get single coin data
  async getCoinData(coinId) {
    try {
      const response = await this.client.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`Error fetching coin ${coinId}:`, error.message);
      throw error;
    }
  }

  // Get trending coins
  async getTrendingCoins() {
    try {
      const response = await this.client.get('/search/trending');
      return response.data.coins || [];
    } catch (error) {
      logger.error('Error fetching trending coins:', error.message);
      throw error;
    }
  }

  // Get global market data
  async getGlobalData() {
    try {
      const response = await this.client.get('/global');
      return response.data.data || {};
    } catch (error) {
      logger.error('Error fetching global data:', error.message);
      throw error;
    }
  }
}

module.exports = new CoinGeckoService();