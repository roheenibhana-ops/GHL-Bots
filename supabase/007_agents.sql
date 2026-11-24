-- The editable voice and sales approach of each agent, with drafts and a version history. Run once in the Supabase SQL editor.
create table if not exists agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  status text not null check (status in ('draft', 'published', 'archived')),
  instructions text not null,
  dials jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists agent_versions_agent_idx on agent_versions (agent, created_at);

alter table agent_versions enable row level security;
grant all on table public.agent_versions to service_role;
