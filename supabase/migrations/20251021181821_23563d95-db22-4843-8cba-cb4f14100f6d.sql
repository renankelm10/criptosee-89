-- Fix trigger error: latest_markets uses last_updated instead of updated_at

-- Drop the existing trigger if it exists (it's trying to update updated_at which doesn't exist)
DROP TRIGGER IF EXISTS update_latest_markets_updated_at ON latest_markets;

-- Create a new trigger function specifically for latest_markets that uses last_updated
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create the correct trigger for latest_markets
CREATE TRIGGER update_latest_markets_last_updated
  BEFORE UPDATE ON latest_markets
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated_column();