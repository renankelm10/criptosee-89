-- Fix function search path security issue with CASCADE
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Recreate the triggers after dropping the function
CREATE TRIGGER update_coins_updated_at
  BEFORE UPDATE ON public.coins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_latest_markets_updated_at
  BEFORE UPDATE ON public.latest_markets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();