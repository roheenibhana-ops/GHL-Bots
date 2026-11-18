-- Run once in the Supabase SQL editor (after schema.sql).
alter table messages
  add column if not exists campaign text,
  add column if not exists segment text,
  add column if not exists contact_name text,
  add column if not exists timezone text,
  add column if not exists phone_e164 text;
create index if not exists messages_campaign_idx on messages (campaign, status);
grant all on all tables in schema public to service_role;
