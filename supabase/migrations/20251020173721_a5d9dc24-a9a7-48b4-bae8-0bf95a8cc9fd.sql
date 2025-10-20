-- Atualizar cron jobs para execução 5 minutos antes da expiração
-- Isso permite que os palpites sejam gerados antecipadamente

-- Remover cron jobs antigos (se existirem)
DO $$
BEGIN
  PERFORM cron.unschedule('generate-predictions-free-cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('generate-predictions-basic-cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('generate-predictions-premium-cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- FREE: Executar aos 55min de cada 2 horas (gera 5min antes da expiração de 2h)
-- Ex: 11:55, 13:55, 15:55... → Palpites prontos para 12:00, 14:00, 16:00
SELECT cron.schedule(
  'generate-predictions-free-cron',
  '55 */2 * * *',
  $$
  SELECT net.http_post(
    url:='https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-free',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- BASIC: Executar aos 55min de cada hora (gera 5min antes da expiração de 1h)
-- Ex: 11:55, 12:55, 13:55... → Palpites prontos para 12:00, 13:00, 14:00
SELECT cron.schedule(
  'generate-predictions-basic-cron',
  '55 * * * *',
  $$
  SELECT net.http_post(
    url:='https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-basic',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- PREMIUM: Executar aos 25min e 55min de cada hora (gera 5min antes da expiração de 30min)
-- Ex: 11:25, 11:55, 12:25, 12:55... → Palpites prontos para 11:30, 12:00, 12:30, 13:00
SELECT cron.schedule(
  'generate-predictions-premium-cron',
  '25,55 * * * *',
  $$
  SELECT net.http_post(
    url:='https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-premium',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);