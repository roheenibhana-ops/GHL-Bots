-- Run once in the Supabase SQL editor. Stores raw webhook payloads so we can see GHL's real format.
create table if not exists webhook_log (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  payload jsonb not null
);
alter table webhook_log enable row level security;
grant all on all tables in schema public to service_role;
notify pgrst, 'reload schema';
