-- Run once in the Supabase SQL editor.
create table if not exists integrations (
  provider text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table integrations enable row level security;
grant all on all tables in schema public to service_role;
