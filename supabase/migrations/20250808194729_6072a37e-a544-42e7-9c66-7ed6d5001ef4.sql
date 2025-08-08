-- Create coins table for basic cryptocurrency information
CREATE TABLE public.coins (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create latest_markets table for current market data
CREATE TABLE public.latest_markets (
  coin_id TEXT PRIMARY KEY REFERENCES public.coins(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  market_cap NUMERIC,
  market_cap_rank INTEGER,
  volume_24h NUMERIC,
  price_change_percentage_1h NUMERIC,
  price_change_percentage_24h NUMERIC,
  price_change_percentage_7d NUMERIC,
  circulating_supply NUMERIC,
  total_supply NUMERIC,
  max_supply NUMERIC,
  ath NUMERIC,
  ath_change_percentage NUMERIC,
  ath_date TIMESTAMP WITH TIME ZONE,
  atl NUMERIC,
  atl_change_percentage NUMERIC,
  atl_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create markets_history table for historical data
CREATE TABLE public.markets_history (
  id BIGSERIAL PRIMARY KEY,
  coin_id TEXT NOT NULL REFERENCES public.coins(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  market_cap NUMERIC,
  volume_24h NUMERIC,
  price_change_percentage_1h NUMERIC,
  price_change_percentage_24h NUMERIC,
  price_change_percentage_7d NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.latest_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Anyone can view coins" 
ON public.coins 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view latest markets" 
ON public.latest_markets 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view markets history" 
ON public.markets_history 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_latest_markets_updated_at ON public.latest_markets(updated_at DESC);
CREATE INDEX idx_latest_markets_price_change_24h ON public.latest_markets(price_change_percentage_24h DESC);
CREATE INDEX idx_markets_history_coin_timestamp ON public.markets_history(coin_id, timestamp DESC);
CREATE INDEX idx_markets_history_timestamp ON public.markets_history(timestamp DESC);

-- Create trigger for updating timestamps
CREATE TRIGGER update_coins_updated_at
BEFORE UPDATE ON public.coins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_latest_markets_updated_at
BEFORE UPDATE ON public.latest_markets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();