-- Criar tabela de votos em predições
CREATE TABLE IF NOT EXISTS public.prediction_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.ai_predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('correct', 'incorrect')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Um usuário só pode votar uma vez por predição
  UNIQUE(prediction_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prediction_votes_prediction ON public.prediction_votes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_votes_user ON public.prediction_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_votes_type ON public.prediction_votes(vote_type);

-- Habilitar RLS
ALTER TABLE public.prediction_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para prediction_votes
CREATE POLICY "Users can view all votes"
ON public.prediction_votes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own votes"
ON public.prediction_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
ON public.prediction_votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
ON public.prediction_votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- View agregada de contagens de votos
CREATE OR REPLACE VIEW public.prediction_vote_counts AS
SELECT 
  prediction_id,
  COUNT(*) FILTER (WHERE vote_type = 'correct') AS correct_votes,
  COUNT(*) FILTER (WHERE vote_type = 'incorrect') AS incorrect_votes,
  COUNT(*) AS total_votes,
  ROUND(
    (COUNT(*) FILTER (WHERE vote_type = 'correct')::NUMERIC / 
     NULLIF(COUNT(*), 0) * 100)::NUMERIC, 
    1
  ) AS accuracy_percentage
FROM public.prediction_votes
GROUP BY prediction_id;

-- View de análise de performance (IA vs Comunidade)
CREATE OR REPLACE VIEW public.prediction_performance_analysis AS
SELECT 
  p.id,
  p.coin_id,
  p.action,
  p.confidence_level,
  p.performance_score AS ai_score,
  p.actual_outcome,
  COALESCE(v.accuracy_percentage, 0) AS community_score,
  COALESCE(v.total_votes, 0) AS total_votes,
  COALESCE(v.correct_votes, 0) AS correct_votes,
  COALESCE(v.incorrect_votes, 0) AS incorrect_votes,
  ABS(COALESCE(p.performance_score, 0) - COALESCE(v.accuracy_percentage, 0)) AS score_difference,
  CASE 
    WHEN v.total_votes >= 10 THEN
      CASE 
        WHEN ABS(COALESCE(p.performance_score, 0) - COALESCE(v.accuracy_percentage, 0)) < 10 THEN 'high_agreement'
        WHEN ABS(COALESCE(p.performance_score, 0) - COALESCE(v.accuracy_percentage, 0)) < 30 THEN 'moderate_agreement'
        ELSE 'divergent'
      END
    WHEN v.total_votes >= 5 THEN 'low_confidence'
    ELSE 'no_consensus'
  END AS consensus_category,
  CASE
    WHEN v.total_votes >= 20 THEN 'high'
    WHEN v.total_votes >= 10 THEN 'medium'
    WHEN v.total_votes >= 5 THEN 'low'
    ELSE 'very_low'
  END AS confidence_level_category,
  p.created_at,
  p.expires_at
FROM public.ai_predictions p
LEFT JOIN public.prediction_vote_counts v ON v.prediction_id = p.id
WHERE p.actual_outcome IS NOT NULL;

-- Função de validação: só pode votar em predições avaliadas
CREATE OR REPLACE FUNCTION public.validate_vote_on_evaluated_prediction()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se a predição tem actual_outcome preenchido
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_predictions 
    WHERE id = NEW.prediction_id 
    AND actual_outcome IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Só é possível votar em predições já avaliadas';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger de validação
CREATE TRIGGER check_prediction_evaluated
  BEFORE INSERT OR UPDATE ON public.prediction_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_vote_on_evaluated_prediction();

-- Trigger de updated_at
CREATE TRIGGER update_prediction_votes_updated_at
  BEFORE UPDATE ON public.prediction_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.prediction_votes IS 'Votos dos usuários sobre a precisão das predições de IA';
COMMENT ON VIEW public.prediction_vote_counts IS 'Agregação de votos por predição';
COMMENT ON VIEW public.prediction_performance_analysis IS 'Análise comparativa entre score da IA e consenso da comunidade';