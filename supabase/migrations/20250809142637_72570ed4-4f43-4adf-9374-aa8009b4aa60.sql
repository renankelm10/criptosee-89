-- Move extensions to the recommended 'extensions' schema
alter extension pg_cron set schema extensions;
alter extension pg_net set schema extensions;