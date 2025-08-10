-- Atualizar o cron job para garantir execução consistente a cada 5 minutos
-- Primeiro, unschedule qualquer job existente
SELECT cron.unschedule('refresh-markets-5min');

-- Recriar o job com configuração mais confiável
SELECT cron.schedule(
  'refresh-markets-5min',
  '*/5 * * * *', -- a cada 5 minutos
  $$
  SELECT
    net.http_post(
        url:='https://ztpbtbtaxqgndwvvzacs.supabase.co/functions/v1/refresh-markets',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cGJ0YnRheHFnbmR3dnZ6YWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjQ3NjYsImV4cCI6MjA3MDAwMDc2Nn0.j0UMddXbaXkMvgYBq3gTIwkOz2FLfqDymk_tCS050aU"}'::jsonb,
        body:='{"pages": 2, "per_page": 250}'::jsonb
    ) as request_id;
  $$
);

-- Verificar se o job foi criado corretamente
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'refresh-markets-5min';