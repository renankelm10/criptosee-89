-- Habilitar extensão pg_cron para agendamento de tarefas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar job que executa avaliação de predições a cada 1 hora
SELECT cron.schedule(
  'evaluate-expired-predictions',
  '0 * * * *', -- A cada hora no minuto 0
  $$
  SELECT
    net.http_post(
      url := 'https://khcuvryopmaemccrptlk.supabase.co/functions/v1/evaluate-predictions',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler para avaliação automática de predições';
