-- Enable required extensions for scheduling and HTTP requests
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Safely unschedule existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-markets-5min');
EXCEPTION WHEN OTHERS THEN
  -- ignore if job doesn't exist
  NULL;
END $$;

-- Schedule the refresh-markets Edge Function to run every 5 minutes
select
  cron.schedule(
    'refresh-markets-5min',
    '*/5 * * * *', -- every 5 minutes
    $$
    select net.http_post(
      url := 'https://ztpbtbtaxqgndwvvzacs.supabase.co/functions/v1/refresh-markets?pages=2&per_page=200',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cGJ0YnRheHFnbmR3dnZ6YWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MjQ3NjYsImV4cCI6MjA3MDAwMDc2Nn0.j0UMddXbaXkMvgYBq3gTIwkOz2FLfqDymk_tCS050aU"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );