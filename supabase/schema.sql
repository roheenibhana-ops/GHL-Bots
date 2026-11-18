-- Run in the Supabase SQL editor. Service key (Worker only) bypasses RLS; RLS is on so nothing else can read.
create extension if not exists "pgcrypto";

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  account text not null check (account in ('lights','dunzo')),
  ghl_contact_id text not null,
  phone_e164 text not null,
  first_name text,
  timezone text,
  segment text,                       -- e.g. past_customer, cold_lead
  status text not null default 'queued', -- queued | sent | replied | booked | opted_out | escalated
  created_at timestamptz not null default now(),
  unique (account, ghl_contact_id)
);
create unique index if not exists contacts_phone_uniq on contacts (phone_e164);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  account text not null,
  contact_id text not null,           -- GHL contact id
  direction text not null check (direction in ('inbound','outbound')),
  body text not null,
  status text not null default 'received', -- received | pending_approval | sending | sent | failed
  cost_cents numeric,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists messages_contact_idx on messages (contact_id, created_at);

create table if not exists optouts (
  account text not null,
  contact_id text not null,
  created_at timestamptz not null default now(),
  primary key (account, contact_id)
);

alter table contacts enable row level security;
alter table messages enable row level security;
alter table optouts enable row level security;
