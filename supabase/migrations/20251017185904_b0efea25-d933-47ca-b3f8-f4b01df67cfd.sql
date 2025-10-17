-- Tabela de moedas rastreadas por usuários premium
CREATE TABLE public.user_tracked_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coin_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, coin_id)
);

-- Habilitar RLS
ALTER TABLE public.user_tracked_coins ENABLE ROW LEVEL SECURITY;

-- Políticas para user_tracked_coins (apenas premium)
CREATE POLICY "Premium users can view own tracked coins"
  ON public.user_tracked_coins
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_id = auth.uid()
      AND plan = 'premium'
    )
  );

CREATE POLICY "Premium users can insert own tracked coins"
  ON public.user_tracked_coins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_id = auth.uid()
      AND plan = 'premium'
    )
  );

CREATE POLICY "Premium users can delete own tracked coins"
  ON public.user_tracked_coins
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_id = auth.uid()
      AND plan = 'premium'
    )
  );

-- Índice para performance
CREATE INDEX idx_user_tracked_coins_user_id ON public.user_tracked_coins(user_id);
CREATE INDEX idx_user_tracked_coins_coin_id ON public.user_tracked_coins(coin_id);