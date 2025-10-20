-- Inserir registros faltantes na user_subscriptions para usuários existentes
INSERT INTO public.user_subscriptions (user_id, plan, started_at, created_at, updated_at)
SELECT 
  p.id,
  'free'::subscription_plan,
  NOW(),
  NOW(),
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.user_subscriptions us 
  WHERE us.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;