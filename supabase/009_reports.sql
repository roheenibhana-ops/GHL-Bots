-- Photo reports: gutter health reports and lighting design previews built from CompanyCam photos.
create table if not exists public.reports (
  id text primary key,
  account text not null,
  kind text not null,
  project_id text not null,
  project_name text,
  address text,
  contact jsonb,
  photos jsonb not null default '[]'::jsonb,
  body jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists reports_created on public.reports (created_at desc);
alter table public.reports enable row level security;
grant all on public.reports to service_role;
