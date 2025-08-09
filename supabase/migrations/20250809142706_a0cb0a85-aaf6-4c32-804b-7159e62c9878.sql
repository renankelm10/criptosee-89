-- Recreate pg_cron and pg_net in the 'extensions' schema and restore the schedule
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Ensure schedule exists (idempotent unschedule)
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-markets-5min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

select
  cron.schedule(
    'refresh-markets-5min',
    '*/5 * * * *',
    $$
    select net.http_post(
      url := 'https://ztpbtbtaxqgndwvvzacs.supabase.co/functions/v1/refresh-markets?pages=2&per_page=200',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cGJ0YnRheHFnbmR3dnZ6YWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjQ3NjYsImV4cCI6MjA3MDAwMDc2Nn0.j0UMddXbaXkMvgYBq3gTIwkOz2FLfqDymk_tCS050aU"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );