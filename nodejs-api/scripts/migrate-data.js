#!/usr/bin/env node

/**
 * Script para migrar dados do Supabase para PostgreSQL local
 * Execute: node scripts/migrate-data.js
 */

require('dotenv').config();
const axios = require('axios');
const { query, testConnection } = require('../src/database/connection');
const logger = require('../src/utils/logger');

const SUPABASE_URL = 'https://ztpbtbtaxqgndwvvzacs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cGJ0YnRheHFnbmR3dnZ6YWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjQ3NjYsImV4cCI6MjA3MDAwMDc2Nn0.j0UMddXbaXkMvgYBq3gTIwkOz2FLfqDymk_tCS050aU';

class DataMigrator {
  constructor() {
    this.supabaseClient = axios.create({
      baseURL: `${SUPABASE_URL}/rest/v1`,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
  }

  async fetchSupabaseData(table, limit = 1000, offset = 0) {
    try {
      const response = await this.supabaseClient.get(`/${table}`, {
        params: {
          limit,
          offset,
          order: 'created_at.asc'
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching ${table} from Supabase:`, error);
      throw error;
    }
  }

  async migrateCoins() {
    logger.info('Migrating coins...');
    
    let offset = 0;
    let totalMigrated = 0;
    const batchSize = 1000;
    
    while (true) {
      const coins = await this.fetchSupabaseData('coins', batchSize, offset);
      
      if (!coins.length) break;
      
      // Batch insert
      const values = [];
      const placeholders = [];
      
      coins.forEach((coin, index) => {
        const baseIndex = index * 4;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`);
        values.push(coin.id, coin.symbol, coin.name, coin.image);
      });
      
      const insertQuery = `
        INSERT INTO coins (id, symbol, name, image)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          symbol = EXCLUDED.symbol,
          name = EXCLUDED.name,
          image = EXCLUDED.image
      `;
      
      await query(insertQuery, values);
      
      totalMigrated += coins.length;
      offset += batchSize;
      
      logger.info(`Migrated ${totalMigrated} coins so far...`);
    }
    
    logger.info(`✅ Coins migration completed: ${totalMigrated} records`);
    return totalMigrated;
  }

  async migrateLatestMarkets() {
    logger.info('Migrating latest markets...');
    
    let offset = 0;
    let totalMigrated = 0;
    const batchSize = 500; // Smaller batches due to more columns
    
    while (true) {
      const markets = await this.fetchSupabaseData('latest_markets', batchSize, offset);
      
      if (!markets.length) break;
      
      // Batch insert
      const values = [];
      const placeholders = [];
      
      markets.forEach((market, index) => {
        const baseIndex = index * 17;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16}, $${baseIndex + 17})`);
        values.push(
          market.coin_id, market.price, market.market_cap, market.market_cap_rank,
          market.volume_24h, market.price_change_percentage_1h, market.price_change_percentage_24h,
          market.price_change_percentage_7d, market.circulating_supply, market.total_supply,
          market.max_supply, market.ath, market.ath_change_percentage, market.ath_date,
          market.atl, market.atl_change_percentage, market.atl_date
        );
      });
      
      const insertQuery = `
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
          atl_date = EXCLUDED.atl_date
      `;
      
      await query(insertQuery, values);
      
      totalMigrated += markets.length;
      offset += batchSize;
      
      logger.info(`Migrated ${totalMigrated} market records so far...`);
    }
    
    logger.info(`✅ Latest markets migration completed: ${totalMigrated} records`);
    return totalMigrated;
  }

  async migrateMarketsHistory() {
    logger.info('Migrating markets history...');
    
    let offset = 0;
    let totalMigrated = 0;
    const batchSize = 1000;
    
    while (true) {
      const history = await this.fetchSupabaseData('markets_history', batchSize, offset);
      
      if (!history.length) break;
      
      // Batch insert
      const values = [];
      const placeholders = [];
      
      history.forEach((record, index) => {
        const baseIndex = index * 7;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`);
        values.push(
          record.coin_id, record.price, record.market_cap, record.volume_24h,
          record.price_change_percentage_1h, record.price_change_percentage_24h,
          record.price_change_percentage_7d
        );
      });
      
      const insertQuery = `
        INSERT INTO markets_history (
          coin_id, price, market_cap, volume_24h,
          price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d
        )
        VALUES ${placeholders.join(', ')}
      `;
      
      await query(insertQuery, values);
      
      totalMigrated += history.length;
      offset += batchSize;
      
      logger.info(`Migrated ${totalMigrated} history records so far...`);
    }
    
    logger.info(`✅ Markets history migration completed: ${totalMigrated} records`);
    return totalMigrated;
  }

  async migrate() {
    const startTime = Date.now();
    logger.info('🚀 Starting data migration from Supabase to PostgreSQL...');
    
    try {
      // Test connection first
      await testConnection();
      logger.info('✅ Database connection successful');
      
      // Migrate in order (referential integrity)
      const coinsCount = await this.migrateCoins();
      const marketsCount = await this.migrateLatestMarkets();
      const historyCount = await this.migrateMarketsHistory();
      
      const duration = Date.now() - startTime;
      
      logger.info('🎉 Migration completed successfully!', {
        duration: `${duration}ms`,
        coins: coinsCount,
        markets: marketsCount,
        history: historyCount,
        total: coinsCount + marketsCount + historyCount
      });
      
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }
}

// Execute migration if called directly
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.migrate().then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  }).catch(error => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = DataMigrator;