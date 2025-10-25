-- ====================================================
-- CRON JOBS PARA SISTEMA DE PREDIÇÕES AUTOMÁTICAS
-- ====================================================

-- 1. CRON JOB: Avaliar predições a cada hora
SELECT cron.schedule(
  'evaluate-predictions-hourly',
  '0 * * * *', -- A cada hora no minuto 0
  $$
  SELECT net.http_post(
    url := 'https://khcuvryopmaemccrptlk.supabase.co/functions/v1/evaluate-predictions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 2. CRON JOB: Gerar predições PREMIUM a cada 30 minutos
SELECT cron.schedule(
  'generate-predictions-premium',
  '*/30 * * * *', -- A cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-premium',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 3. CRON JOB: Gerar predições BASIC a cada 2 horas
SELECT cron.schedule(
  'generate-predictions-basic',
  '0 */2 * * *', -- A cada 2 horas no minuto 0
  $$
  SELECT net.http_post(
    url := 'https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-basic',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 4. CRON JOB: Gerar predições FREE a cada 6 horas
SELECT cron.schedule(
  'generate-predictions-free',
  '0 */6 * * *', -- A cada 6 horas no minuto 0
  $$
  SELECT net.http_post(
    url := 'https://khcuvryopmaemccrptlk.supabase.co/functions/v1/generate-predictions-free',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);