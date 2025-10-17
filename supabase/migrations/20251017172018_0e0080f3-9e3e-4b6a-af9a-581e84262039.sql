-- Create coins table to store cryptocurrency information
CREATE TABLE IF NOT EXISTS public.coins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  image TEXT,
  market_cap_rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create latest_markets table to store current market data
CREATE TABLE IF NOT EXISTS public.latest_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id TEXT NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
  current_price DECIMAL,
  market_cap DECIMAL,
  total_volume DECIMAL,
  price_change_percentage_24h DECIMAL,
  price_change_percentage_7d DECIMAL,
  price_change_percentage_30d DECIMAL,
  circulating_supply DECIMAL,
  total_supply DECIMAL,
  max_supply DECIMAL,
  ath DECIMAL,
  atl DECIMAL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coin_id)
);

-- Create markets_history table to store historical market data
CREATE TABLE IF NOT EXISTS public.markets_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id TEXT NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
  current_price DECIMAL,
  market_cap DECIMAL,
  total_volume DECIMAL,
  price_change_percentage_24h DECIMAL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create global_market_data table for overall market statistics
CREATE TABLE IF NOT EXISTS public.global_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_market_cap DECIMAL,
  total_volume DECIMAL,
  active_cryptocurrencies INTEGER,
  markets INTEGER,
  market_cap_change_percentage_24h DECIMAL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.latest_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_market_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (cryptocurrency data is public)
CREATE POLICY "Allow public read access to coins"
  ON public.coins FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to latest_markets"
  ON public.latest_markets FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to markets_history"
  ON public.markets_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to global_market_data"
  ON public.global_market_data FOR SELECT
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_coins_symbol ON public.coins(symbol);
CREATE INDEX IF NOT EXISTS idx_coins_market_cap_rank ON public.coins(market_cap_rank);
CREATE INDEX IF NOT EXISTS idx_latest_markets_coin_id ON public.latest_markets(coin_id);
CREATE INDEX IF NOT EXISTS idx_markets_history_coin_id ON public.markets_history(coin_id);
CREATE INDEX IF NOT EXISTS idx_markets_history_timestamp ON public.markets_history(timestamp DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coins_updated_at
  BEFORE UPDATE ON public.coins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_latest_markets_updated_at
  BEFORE UPDATE ON public.latest_markets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();