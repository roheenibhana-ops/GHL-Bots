-- What each AI call used, so the dashboard can show cost by job.
create table if not exists public.ai_usage (
  id bigserial primary key,
  at timestamptz not null default now(),
  task text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read integer not null default 0,
  cache_write integer not null default 0
);
create index if not exists ai_usage_at on public.ai_usage (at desc);
alter table public.ai_usage enable row level security;
grant all on public.ai_usage to service_role;
grant usage, select on sequence public.ai_usage_id_seq to service_role;
