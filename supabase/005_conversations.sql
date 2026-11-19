-- Run once in the Supabase SQL editor.
create table if not exists conversations (
  contact_id text primary key,
  account text not null,
  facts jsonb not null default '{}',
  status text not null default 'active',   -- active | handed_off | closed
  updated_at timestamptz not null default now()
);
alter table conversations enable row level security;
grant all on all tables in schema public to service_role;
notify pgrst, 'reload schema';
