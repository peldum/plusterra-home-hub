
-- Move extensions to their own schema to fix security warning
CREATE SCHEMA IF NOT EXISTS extensions;

DROP EXTENSION IF EXISTS pg_cron;
DROP EXTENSION IF EXISTS pg_net;

CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
