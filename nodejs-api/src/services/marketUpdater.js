const coinGeckoService = require('./coinGeckoService');
const cryptoQueries = require('../database/queries');
const { getClient } = require('../database/connection');
const logger = require('../utils/logger');

class MarketUpdater {
  async updateMarkets(pages = 2, perPage = 250) {
    const startTime = Date.now();
    logger.info('Starting market update...', { pages, perPage });

    let client;
    try {
      // Get fresh data from CoinGecko
      const allCoins = await coinGeckoService.fetchMarkets(pages, perPage);
      
      if (!allCoins.length) {
        throw new Error('No coins data received from CoinGecko');
      }

      // Use transaction for data consistency
      client = await getClient();
      await client.query('BEGIN');

      // Prepare data for upsert
      const coinsData = allCoins.map(coin => coinGeckoService.transformCoinData(coin));
      const marketsData = allCoins.map(coin => coinGeckoService.transformMarketData(coin));

      // Batch upsert coins
      await this.batchUpsertCoins(client, coinsData);
      logger.info(`Upserted ${coinsData.length} coins`);

      // Batch upsert markets
      await this.batchUpsertMarkets(client, marketsData);
      logger.info(`Upserted ${marketsData.length} market records`);

      // Insert history for top coins only (to limit growth)
      const historyData = marketsData
        .filter(market => market.market_cap_rank && market.market_cap_rank <= perPage)
        .map(market => ({
          coin_id: market.coin_id,
          price: market.price,
          market_cap: market.market_cap,
          volume_24h: market.volume_24h,
          price_change_percentage_1h: market.price_change_percentage_1h,
          price_change_percentage_24h: market.price_change_percentage_24h,
          price_change_percentage_7d: market.price_change_percentage_7d
        }));

      if (historyData.length > 0) {
        await this.batchInsertHistory(client, historyData);
        logger.info(`Inserted ${historyData.length} history records`);
      }

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      const result = {
        count: allCoins.length,
        pages,
        perPage,
        duration: `${duration}ms`,
        coinsUpdated: coinsData.length,
        marketsUpdated: marketsData.length,
        historyInserted: historyData.length
      };

      logger.info('Market update completed successfully', result);
      return result;

    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      logger.error('Market update failed:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async batchUpsertCoins(client, coinsData) {
    const chunkSize = 100;
    
    for (let i = 0; i < coinsData.length; i += chunkSize) {
      const chunk = coinsData.slice(i, i + chunkSize);
      
      const values = [];
      const placeholders = [];
      
      chunk.forEach((coin, index) => {
        const baseIndex = index * 4;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`);
        values.push(coin.id, coin.symbol, coin.name, coin.image);
      });

      const query = `
        INSERT INTO coins (id, symbol, name, image)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          symbol = EXCLUDED.symbol,
          name = EXCLUDED.name,
          image = EXCLUDED.image,
          updated_at = NOW()
      `;

      await client.query(query, values);
    }
  }

  async batchUpsertMarkets(client, marketsData) {
    const chunkSize = 50; // Smaller chunks due to more columns
    
    for (let i = 0; i < marketsData.length; i += chunkSize) {
      const chunk = marketsData.slice(i, i + chunkSize);
      
      const values = [];
      const placeholders = [];
      
      chunk.forEach((market, index) => {
        const baseIndex = index * 17; // 17 columns
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16}, $${baseIndex + 17})`);
        values.push(
          market.coin_id, market.price, market.market_cap, market.market_cap_rank, 
          market.volume_24h, market.price_change_percentage_1h, market.price_change_percentage_24h, 
          market.price_change_percentage_7d, market.circulating_supply, market.total_supply, 
          market.max_supply, market.ath, market.ath_change_percentage, market.ath_date,
          market.atl, market.atl_change_percentage, market.atl_date
        );
      });

      const query = `
        INSERT INTO latest_markets (
          coin_id, price, market_cap, market_cap_rank, volume_24h,
          price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d,
          circulating_supply, total_supply, max_supply,
          ath, ath_change_percentage, ath_date,
          atl, atl_change_percentage, atl_date
        )
        VALUES ${placeholders.join(', ')}
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
      `;

      await client.query(query, values);
    }
  }

  async batchInsertHistory(client, historyData) {
    const chunkSize = 100;
    
    for (let i = 0; i < historyData.length; i += chunkSize) {
      const chunk = historyData.slice(i, i + chunkSize);
      
      const values = [];
      const placeholders = [];
      
      chunk.forEach((history, index) => {
        const baseIndex = index * 7; // 7 columns
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`);
        values.push(
          history.coin_id, history.price, history.market_cap, 
          history.volume_24h, history.price_change_percentage_1h, 
          history.price_change_percentage_24h, history.price_change_percentage_7d
        );
      });

      const query = `
        INSERT INTO markets_history (
          coin_id, price, market_cap, volume_24h,
          price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d
        )
        VALUES ${placeholders.join(', ')}
      `;

      await client.query(query, values);
    }
  }
}

module.exports = new MarketUpdater();