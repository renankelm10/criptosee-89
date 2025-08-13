-- Schema para substituir o Supabase
-- Executar no PostgreSQL "Criptosee" do Easypanel

-- Tabela de moedas (equivalente ao Supabase)
CREATE TABLE IF NOT EXISTS coins (
    id VARCHAR(100) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mercados atuais (equivalente ao Supabase)
CREATE TABLE IF NOT EXISTS latest_markets (
    coin_id VARCHAR(100) PRIMARY KEY REFERENCES coins(id),
    price DECIMAL(20, 8),
    market_cap BIGINT,
    market_cap_rank INTEGER,
    volume_24h BIGINT,
    price_change_percentage_1h DECIMAL(10, 4),
    price_change_percentage_24h DECIMAL(10, 4),
    price_change_percentage_7d DECIMAL(10, 4),
    circulating_supply DECIMAL(20, 2),
    total_supply DECIMAL(20, 2),
    max_supply DECIMAL(20, 2),
    ath DECIMAL(20, 8),
    ath_change_percentage DECIMAL(10, 4),
    ath_date TIMESTAMP WITH TIME ZONE,
    atl DECIMAL(20, 8),
    atl_change_percentage DECIMAL(10, 4),
    atl_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de mercados (equivalente ao Supabase)
CREATE TABLE IF NOT EXISTS markets_history (
    id SERIAL PRIMARY KEY,
    coin_id VARCHAR(100) REFERENCES coins(id),
    price DECIMAL(20, 8),
    market_cap BIGINT,
    volume_24h BIGINT,
    price_change_percentage_1h DECIMAL(10, 4),
    price_change_percentage_24h DECIMAL(10, 4),
    price_change_percentage_7d DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de notificações por email (equivalente ao Supabase)
CREATE TABLE IF NOT EXISTS email_notifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    coin_id VARCHAR(100) REFERENCES coins(id),
    price_threshold DECIMAL(20, 8) NOT NULL,
    threshold_type VARCHAR(10) CHECK (threshold_type IN ('above', 'below')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de log de notificações (equivalente ao Supabase)
CREATE TABLE IF NOT EXISTS notification_log (
    id SERIAL PRIMARY KEY,
    email_notification_id INTEGER REFERENCES email_notifications(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    price_at_notification DECIMAL(20, 8),
    status VARCHAR(20) DEFAULT 'sent'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_latest_markets_market_cap_rank ON latest_markets(market_cap_rank);
CREATE INDEX IF NOT EXISTS idx_latest_markets_price ON latest_markets(price);
CREATE INDEX IF NOT EXISTS idx_markets_history_coin_id ON markets_history(coin_id);
CREATE INDEX IF NOT EXISTS idx_markets_history_created_at ON markets_history(created_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_coin_id ON email_notifications(coin_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_active ON email_notifications(is_active);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coins_updated_at 
    BEFORE UPDATE ON coins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_latest_markets_updated_at 
    BEFORE UPDATE ON latest_markets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_notifications_updated_at 
    BEFORE UPDATE ON email_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View para dados globais do mercado
CREATE OR REPLACE VIEW global_market_data AS
SELECT 
    COUNT(*) as total_coins,
    SUM(market_cap) as total_market_cap,
    SUM(volume_24h) as total_volume_24h,
    AVG(price_change_percentage_24h) as avg_change_24h
FROM latest_markets
WHERE market_cap IS NOT NULL;

COMMENT ON TABLE coins IS 'Tabela de criptomoedas - migrada do Supabase';
COMMENT ON TABLE latest_markets IS 'Dados atuais de mercado - migrada do Supabase';
COMMENT ON TABLE markets_history IS 'Histórico de mercado - migrada do Supabase';
COMMENT ON VIEW global_market_data IS 'Dados globais calculados do mercado';