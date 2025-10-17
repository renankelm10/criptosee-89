-- Criar enum para tipos de planos
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'premium');

-- Criar enum para ações recomendadas
CREATE TYPE public.ai_action AS ENUM ('buy', 'sell', 'hold', 'watch', 'alert');

-- Tabela de assinaturas de usuários
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan subscription_plan NOT NULL DEFAULT 'free',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela de palpites da IA
CREATE TABLE public.ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id text NOT NULL,
  action ai_action NOT NULL,
  confidence_level integer CHECK (confidence_level >= 0 AND confidence_level <= 100),
  reasoning text NOT NULL,
  indicators jsonb,
  price_projection numeric,
  timeframe text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  actual_outcome text,
  performance_score integer
);

-- Tabela de palpites visualizados por usuário (para limitar no plano gratuito)
CREATE TABLE public.user_prediction_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prediction_id uuid REFERENCES public.ai_predictions(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prediction_views ENABLE ROW LEVEL SECURITY;

-- Políticas para user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON public.user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas para ai_predictions (todos podem ver)
CREATE POLICY "Authenticated users can view predictions"
  ON public.ai_predictions
  FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para user_prediction_views
CREATE POLICY "Users can view own prediction views"
  ON public.user_prediction_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prediction views"
  ON public.user_prediction_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar assinatura gratuita automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (new.id, 'free');
  RETURN new;
END;
$$;

-- Trigger para criar assinatura ao criar usuário
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- Função para obter plano do usuário
CREATE OR REPLACE FUNCTION public.get_user_plan(user_uuid uuid)
RETURNS subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan 
  FROM public.user_subscriptions 
  WHERE user_id = user_uuid
  LIMIT 1;
$$;

-- Função para contar visualizações de palpites hoje
CREATE OR REPLACE FUNCTION public.count_today_prediction_views(user_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_prediction_views
  WHERE user_id = user_uuid
    AND viewed_at >= CURRENT_DATE;
$$;