const { query } = require('./connection');
const logger = require('../utils/logger');

class CryptoQueries {
  // Get all coins
  async getAllCoins() {
    const result = await query(`
      SELECT c.*, lm.price, lm.market_cap_rank, lm.price_change_percentage_24h
      FROM coins c
      LEFT JOIN latest_markets lm ON c.id = lm.coin_id
      ORDER BY lm.market_cap_rank ASC NULLS LAST
    `);
    return result.rows;
  }

  // Get coin by ID
  async getCoinById(coinId) {
    const result = await query(`
      SELECT c.*, lm.*
      FROM coins c
      LEFT JOIN latest_markets lm ON c.id = lm.coin_id
      WHERE c.id = $1
    `, [coinId]);
    return result.rows[0];
  }

  // Get latest markets with pagination
  async getLatestMarkets(page = 1, limit = 100) {
    const offset = (page - 1) * limit;
    const result = await query(`
      SELECT c.id, c.symbol, c.name, c.image, lm.*
      FROM latest_markets lm
      JOIN coins c ON lm.coin_id = c.id
      ORDER BY lm.market_cap_rank ASC NULLS LAST
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return result.rows;
  }

  // Get market history for a coin
  async getMarketHistory(coinId, limit = 100) {
    const result = await query(`
      SELECT *
      FROM markets_history
      WHERE coin_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [coinId, limit]);
    return result.rows;
  }

  // Get global market data
  async getGlobalMarketData() {
    const result = await query(`
      SELECT * FROM global_market_data
    `);
    return result.rows[0];
  }

  // Search coins
  async searchCoins(searchTerm) {
    const result = await query(`
      SELECT c.*, lm.price, lm.market_cap_rank, lm.price_change_percentage_24h
      FROM coins c
      LEFT JOIN latest_markets lm ON c.id = lm.coin_id
      WHERE 
        c.name ILIKE $1 OR 
        c.symbol ILIKE $1 OR 
        c.id ILIKE $1
      ORDER BY lm.market_cap_rank ASC NULLS LAST
      LIMIT 50
    `, [`%${searchTerm}%`]);
    return result.rows;
  }

  // Upsert coin data (for market updates)
  async upsertCoin(coinData) {
    const { id, symbol, name, image } = coinData;
    await query(`
      INSERT INTO coins (id, symbol, name, image)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        symbol = EXCLUDED.symbol,
        name = EXCLUDED.name,
        image = EXCLUDED.image,
        updated_at = NOW()
    `, [id, symbol, name, image]);
  }

  // Upsert market data
  async upsertMarketData(marketData) {
    const {
      coin_id, price, market_cap, market_cap_rank, volume_24h,
      price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d,
      circulating_supply, total_supply, max_supply,
      ath, ath_change_percentage, ath_date,
      atl, atl_change_percentage, atl_date
    } = marketData;

    await query(`
      INSERT INTO latest_markets (
        coin_id, price, market_cap, market_cap_rank, volume_24h,
        price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d,
        circulating_supply, total_supply, max_supply,
        ath, ath_change_percentage, ath_date,
        atl, atl_change_percentage, atl_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (coin_id) DO UPDATE SET
        price = EXCLUDED.price,
        market_cap = EXCLUDED.market_cap,
        market_cap_rank = EXCLUDED.market_cap_rank,
        volume_24h = EXCLUDED.volume_24h,
        price_change_percentage_1h = EXCLUDED.price_change_percentage_1h,
        price_change_percentage_24h = EXCLUDED.price_change_percentage_24h,
        price_change_percentage_7d = EXCLUDED.price_change_percentage_7d,
        circulating_supply = EXCLUDED.circulating_supply,
        total_supply = EXCLUDED.total_supply,
        max_supply = EXCLUDED.max_supply,
        ath = EXCLUDED.ath,
        ath_change_percentage = EXCLUDED.ath_change_percentage,
        ath_date = EXCLUDED.ath_date,
        atl = EXCLUDED.atl,
        atl_change_percentage = EXCLUDED.atl_change_percentage,
        atl_date = EXCLUDED.atl_date,
        updated_at = NOW()
    `, [
      coin_id, price, market_cap, market_cap_rank, volume_24h,
      price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d,
      circulating_supply, total_supply, max_supply,
      ath, ath_change_percentage, ath_date,
      atl, atl_change_percentage, atl_date
    ]);
  }

  // Insert market history
  async insertMarketHistory(historyData) {
    const { coin_id, price, market_cap, volume_24h, price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d } = historyData;
    
    await query(`
      INSERT INTO markets_history (
        coin_id, price, market_cap, volume_24h,
        price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [coin_id, price, market_cap, volume_24h, price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d]);
  }

  // Get top gainers/losers
  async getTopMovers(type = 'gainers', limit = 10) {
    const orderBy = type === 'gainers' ? 'DESC' : 'ASC';
    const result = await query(`
      SELECT c.id, c.symbol, c.name, c.image, 
             lm.price, lm.price_change_percentage_24h, lm.market_cap_rank
      FROM latest_markets lm
      JOIN coins c ON lm.coin_id = c.id
      WHERE lm.price_change_percentage_24h IS NOT NULL
      ORDER BY lm.price_change_percentage_24h ${orderBy}
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  // Get market stats
  async getMarketStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_coins,
        SUM(CASE WHEN price_change_percentage_24h > 0 THEN 1 ELSE 0 END) as gainers,
        SUM(CASE WHEN price_change_percentage_24h < 0 THEN 1 ELSE 0 END) as losers,
        AVG(price_change_percentage_24h) as avg_change_24h,
        SUM(volume_24h) as total_volume_24h,
        SUM(market_cap) as total_market_cap
      FROM latest_markets
      WHERE price IS NOT NULL
    `);
    return result.rows[0];
  }
}

module.exports = new CryptoQueries();