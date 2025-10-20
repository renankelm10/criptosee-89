-- Adicionar campos para o sistema de oportunidades e indicadores técnicos
ALTER TABLE ai_predictions 
ADD COLUMN IF NOT EXISTS opportunity_level text 
CHECK (opportunity_level IN ('normal', 'warm', 'hot')) 
DEFAULT 'normal';

ALTER TABLE ai_predictions 
ADD COLUMN IF NOT EXISTS technical_indicators jsonb 
DEFAULT '{}'::jsonb;

-- Criar índice para facilitar queries de oportunidades quentes
CREATE INDEX IF NOT EXISTS idx_ai_predictions_opportunity_level 
ON ai_predictions(opportunity_level) 
WHERE opportunity_level IN ('warm', 'hot');