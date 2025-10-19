-- Adicionar coluna risk_score à tabela ai_predictions
ALTER TABLE public.ai_predictions 
ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score >= 1 AND risk_score <= 10);

-- Criar índice para melhor performance nas queries filtradas por risk_score
CREATE INDEX IF NOT EXISTS idx_ai_predictions_risk_score ON public.ai_predictions(risk_score);

-- Criar índice composto para otimizar queries por created_at e risk_score
CREATE INDEX IF NOT EXISTS idx_ai_predictions_created_risk ON public.ai_predictions(created_at DESC, risk_score);

-- Função para limpar previsões expiradas (será usada pelo cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_predictions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deletar previsões expiradas (mais de 7 dias)
  DELETE FROM public.ai_predictions
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  RAISE NOTICE 'Expired predictions cleaned up';
END;
$$;

-- Criar view para facilitar acesso às previsões ativas ordenadas por risco
CREATE OR REPLACE VIEW public.active_predictions_by_risk AS
SELECT 
  ap.*,
  c.name as coin_name,
  c.symbol as coin_symbol,
  c.image as coin_image
FROM public.ai_predictions ap
INNER JOIN public.coins c ON ap.coin_id = c.id
WHERE ap.expires_at > NOW()
  OR ap.expires_at IS NULL
ORDER BY ap.risk_score ASC, ap.created_at DESC;