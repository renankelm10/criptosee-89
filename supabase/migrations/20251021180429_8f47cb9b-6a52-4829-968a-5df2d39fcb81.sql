-- Habilitar extensões necessárias para cron jobs e requisições HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para atualizar mercados a cada 5 minutos
SELECT cron.schedule(
  'refresh-markets-job',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://khcuvryopmaemccrptlk.supabase.co/functions/v1/refresh-markets?pages=4&per_page=250',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3V2cnlvcG1hZW1jY3JwdGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTg5NzgsImV4cCI6MjA3NjI5NDk3OH0.qKcmnV6bpKLq1OXz_5TuYymwg0HFoyrHY7OeebCrdeg'
      ),
      body := '{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Função para limpar histórico antigo (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_market_history()
RETURNS void AS $$
BEGIN
  DELETE FROM markets_history
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Limpeza concluída: registros com mais de 30 dias foram removidos';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Agendar limpeza diária às 3h da manhã
SELECT cron.schedule(
  'cleanup-history-job',
  '0 3 * * *', -- 3h da manhã todos os dias
  'SELECT cleanup_old_market_history();'
);

-- View para monitorar saúde do sistema
CREATE OR REPLACE VIEW market_health AS
SELECT
  (SELECT COUNT(*) FROM coins) as total_coins,
  (SELECT COUNT(*) FROM latest_markets) as total_markets,
  (SELECT MAX(last_updated) FROM latest_markets) as last_backend_update,
  (SELECT COUNT(*) FROM markets_history WHERE created_at > NOW() - INTERVAL '1 hour') as records_last_hour,
  (SELECT COUNT(DISTINCT coin_id) FROM markets_history) as coins_with_history,
  (SELECT COUNT(*) FROM markets_history WHERE created_at > NOW() - INTERVAL '30 days') as total_history_30d;

COMMENT ON VIEW market_health IS 'Monitoramento em tempo real da saúde do sistema de mercados';

-- Verificar cron jobs criados
SELECT jobid, schedule, command FROM cron.job WHERE jobname IN ('refresh-markets-job', 'cleanup-history-job');