-- Add market_cap_rank column to latest_markets table
ALTER TABLE public.latest_markets 
ADD COLUMN IF NOT EXISTS market_cap_rank INTEGER;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_latest_markets_market_cap_rank 
ON public.latest_markets(market_cap_rank);