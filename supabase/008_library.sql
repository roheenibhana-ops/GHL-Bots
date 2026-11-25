-- The library: what the agents learn from real calls and texts (batches, playbooks, and the study's progress).
create table if not exists public.library (
  id bigserial primary key,
  company text not null,
  kind text not null,
  n integer not null default 0,
  body jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists library_kind_company on public.library (kind, company, n);
alter table public.library enable row level security;
grant all on public.library to service_role;
grant usage, select on sequence public.library_id_seq to service_role;
