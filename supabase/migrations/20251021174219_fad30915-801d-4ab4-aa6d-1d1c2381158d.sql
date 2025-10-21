-- Criar tabela para armazenar sentimento de criptomoedas
CREATE TABLE IF NOT EXISTS public.coin_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id TEXT NOT NULL,
  sentiment_score NUMERIC, -- -1 (muito negativo) a 1 (muito positivo)
  positive_mentions INTEGER DEFAULT 0,
  negative_mentions INTEGER DEFAULT 0,
  neutral_mentions INTEGER DEFAULT 0,
  total_mentions INTEGER DEFAULT 0,
  recent_news JSONB DEFAULT '[]'::jsonb,
  sources JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas rápidas por moeda e timestamp
CREATE INDEX IF NOT EXISTS idx_coin_sentiment_coin_timestamp ON public.coin_sentiment(coin_id, timestamp DESC);

-- Índice para buscar sentimentos recentes
CREATE INDEX IF NOT EXISTS idx_coin_sentiment_timestamp ON public.coin_sentiment(timestamp DESC);

-- Adicionar RLS
ALTER TABLE public.coin_sentiment ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ler sentimentos
CREATE POLICY "Allow public read access to coin_sentiment"
  ON public.coin_sentiment
  FOR SELECT
  USING (true);

-- Adicionar novos campos em ai_predictions para dados enriquecidos
ALTER TABLE public.ai_predictions 
ADD COLUMN IF NOT EXISTS bitcoin_correlation NUMERIC,
ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC,
ADD COLUMN IF NOT EXISTS macd_signal TEXT,
ADD COLUMN IF NOT EXISTS bollinger_position TEXT,
ADD COLUMN IF NOT EXISTS ema_trend TEXT,
ADD COLUMN IF NOT EXISTS near_support BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS near_resistance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS support_price NUMERIC,
ADD COLUMN IF NOT EXISTS resistance_price NUMERIC,
ADD COLUMN IF NOT EXISTS volume_analysis TEXT;