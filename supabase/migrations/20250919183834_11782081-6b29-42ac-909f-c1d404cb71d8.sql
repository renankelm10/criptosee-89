-- Create table for AI analysis results
CREATE TABLE public.crypto_ai_analysis (
  id BIGINT NOT NULL DEFAULT generate_random_uuid() PRIMARY KEY,
  coin_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analysis_type TEXT NOT NULL, -- 'technical', 'sentiment', 'recommendation'
  signal TEXT NOT NULL, -- 'buy', 'sell', 'hold', 'strong_buy', 'strong_sell'
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  analysis_data JSONB NOT NULL, -- Contains indicators, patterns, reasoning
  reasoning TEXT NOT NULL,
  price_at_analysis NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crypto_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for AI analysis
CREATE POLICY "Anyone can view AI analysis" 
ON public.crypto_ai_analysis 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert AI analysis" 
ON public.crypto_ai_analysis 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_crypto_ai_analysis_coin_timestamp ON public.crypto_ai_analysis(coin_id, timestamp DESC);
CREATE INDEX idx_crypto_ai_analysis_signal ON public.crypto_ai_analysis(signal, timestamp DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crypto_ai_analysis_updated_at
BEFORE UPDATE ON public.crypto_ai_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for AI monitoring settings
CREATE TABLE public.crypto_monitoring_settings (
  id BIGINT NOT NULL DEFAULT generate_random_uuid() PRIMARY KEY,
  coin_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  analysis_frequency_minutes INTEGER NOT NULL DEFAULT 15, -- How often to analyze
  last_analysis TIMESTAMP WITH TIME ZONE,
  alert_thresholds JSONB, -- Custom thresholds for alerts
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crypto_monitoring_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view monitoring settings" 
ON public.crypto_monitoring_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage monitoring settings" 
ON public.crypto_monitoring_settings 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crypto_monitoring_settings_updated_at
BEFORE UPDATE ON public.crypto_monitoring_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();