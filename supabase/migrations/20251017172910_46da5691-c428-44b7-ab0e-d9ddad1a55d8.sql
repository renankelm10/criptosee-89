-- Add missing columns to latest_markets table
ALTER TABLE public.latest_markets 
ADD COLUMN IF NOT EXISTS ath DECIMAL,
ADD COLUMN IF NOT EXISTS ath_change_percentage DECIMAL,
ADD COLUMN IF NOT EXISTS ath_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS atl DECIMAL,
ADD COLUMN IF NOT EXISTS atl_change_percentage DECIMAL,
ADD COLUMN IF NOT EXISTS atl_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS price_change_percentage_1h DECIMAL,
ADD COLUMN IF NOT EXISTS price_change_percentage_30d DECIMAL;

-- Check if columns exist before renaming
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'latest_markets' AND column_name = 'price') THEN
    ALTER TABLE public.latest_markets RENAME COLUMN price TO current_price;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'latest_markets' AND column_name = 'volume_24h') THEN
    ALTER TABLE public.latest_markets RENAME COLUMN volume_24h TO total_volume;
  END IF;
END $$;