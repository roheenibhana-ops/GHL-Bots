-- Settings you can change from the dashboard, without redeploying. Run this once in the Supabase SQL editor.
create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;
