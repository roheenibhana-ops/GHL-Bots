-- Flows in watch mode: what each flow would have done for each real event, and whether the Zap did the same.
create table if not exists public.flow_runs (
  id bigserial primary key,
  flow text not null,
  account text not null,
  key text not null unique,
  subject text,
  summary text,
  plan jsonb not null default '{}'::jsonb,
  mode text not null default 'watch',
  verdict text,
  verdict_note text,
  created_at timestamptz not null default now()
);
create index if not exists flow_runs_flow on public.flow_runs (flow, account, created_at desc);
alter table public.flow_runs enable row level security;
grant all on public.flow_runs to service_role;
grant usage, select on sequence public.flow_runs_id_seq to service_role;
