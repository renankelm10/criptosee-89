-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Habilitar realtime para ai_predictions
ALTER TABLE public.ai_predictions REPLICA IDENTITY FULL;

-- Adicionar à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_predictions;

-- Criar cron job para gerar palpites FREE (a cada 2 horas)
SELECT cron.schedule(
  'generate-predictions-free',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url:='https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-free',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb
  ) as request_id;
  $$
);

-- Criar cron job para gerar palpites BASIC (a cada 1 hora)
SELECT cron.schedule(
  'generate-predictions-basic',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-basic',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb
  ) as request_id;
  $$
);

-- Criar cron job para gerar palpites PREMIUM (a cada 30 minutos)
SELECT cron.schedule(
  'generate-predictions-premium',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-premium',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb
  ) as request_id;
  $$
);

-- Criar função para limpar palpites expirados (executar diariamente)
SELECT cron.schedule(
  'cleanup-expired-predictions',
  '0 0 * * *',
  $$
  DELETE FROM public.ai_predictions WHERE expires_at < NOW();
  $$
);