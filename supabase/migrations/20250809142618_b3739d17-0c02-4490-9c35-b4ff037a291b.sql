-- Move extensions to the recommended 'extensions' schema to satisfy security best practices
alter extension if exists pg_cron set schema extensions;
alter extension if exists pg_net set schema extensions;