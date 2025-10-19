-- Adicionar coluna target_plan na tabela ai_predictions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium');
  END IF;
END $$;

-- Adicionar coluna target_plan se não existir
ALTER TABLE public.ai_predictions 
ADD COLUMN IF NOT EXISTS target_plan subscription_plan NOT NULL DEFAULT 'free';

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_predictions_target_plan ON public.ai_predictions(target_plan);
CREATE INDEX IF NOT EXISTS idx_predictions_expires_at ON public.ai_predictions(expires_at);
CREATE INDEX IF NOT EXISTS idx_predictions_plan_expires ON public.ai_predictions(target_plan, expires_at);

-- Remover tabela de views que não é mais necessária
DROP TABLE IF EXISTS public.user_prediction_views CASCADE;

-- Remover função que não é mais necessária
DROP FUNCTION IF EXISTS public.count_today_prediction_views(uuid) CASCADE;

-- Atualizar políticas RLS para filtrar por plano
DROP POLICY IF EXISTS "Authenticated users can view predictions" ON public.ai_predictions;

CREATE POLICY "Users can view predictions for their plan"
ON public.ai_predictions
FOR SELECT
TO authenticated
USING (
  target_plan <= (
    SELECT plan 
    FROM public.user_subscriptions 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- Permitir acesso público para visualização (necessário para o sistema compartilhado)
CREATE POLICY "Public can view all predictions"
ON public.ai_predictions
FOR SELECT
TO public
USING (true);