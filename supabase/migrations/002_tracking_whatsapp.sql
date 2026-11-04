-- GS Gestão Clínica — migração 002: tracking, WhatsApp, eventos da Meta e lead score
-- Rodar no SQL Editor depois do schema.sql. Pode rodar mais de uma vez sem erro.

-- ============ CONFIGURAÇÃO POR CLÍNICA ============
alter table clinics add column if not exists whatsapp_phone_number_id text unique;  -- roteia a mensagem para a clínica certa
alter table clinics add column if not exists whatsapp_waba_id text;
alter table clinics add column if not exists meta_dataset_id text;
alter table clinics add column if not exists qualified_score int default 60;         -- nota mínima para "lead qualificado"

-- ============ TRACKING E LEAD SCORE NO LEAD ============
alter table leads add column if not exists wa_id text;            -- número do WhatsApp do lead (formato da Meta)
alter table leads add column if not exists ctwa_clid text;        -- clique do anúncio que abriu o WhatsApp
alter table leads add column if not exists ad_id text;
alter table leads add column if not exists adset_id text;
alter table leads add column if not exists campaign_id text;
alter table leads add column if not exists ad_headline text;
alter table leads add column if not exists ad_source_url text;
alter table leads add column if not exists fbclid text;
alter table leads add column if not exists fbc text;
alter table leads add column if not exists fbp text;
alter table leads add column if not exists gclid text;
alter table leads add column if not exists utm_term text;
alter table leads add column if not exists landing_page text;
alter table leads add column if not exists score int;
alter table leads add column if not exists temperature text;      -- frio | morno | quente
alter table leads add column if not exists score_reason text;
alter table leads add column if not exists scored_at timestamptz;
create unique index if not exists leads_clinic_wa_id on leads (clinic_id, wa_id) where wa_id is not null;

-- ============ MENSAGENS ============
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  wa_message_id text unique,
  direction text not null check (direction in ('in', 'out')),
  type text,
  body text,
  payload jsonb,
  sent_at timestamptz default now()
);
create index if not exists messages_lead_time on messages (lead_id, sent_at);
alter table messages enable row level security;
drop policy if exists messages_select on messages;
create policy messages_select on messages for select using (can_see_clinic(clinic_id));

-- ============ EVENTOS ENVIADOS PARA A META (auditoria e reenvio) ============
create table if not exists capi_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  event_name text not null,
  event_id text not null unique,                 -- evita duplicidade na Meta
  status text not null default 'pending',        -- pending | sent | error | skipped
  request jsonb,
  response jsonb,
  created_at timestamptz default now()
);
alter table capi_events enable row level security;
drop policy if exists capi_select on capi_events;
create policy capi_select on capi_events for select using (can_see_finance(clinic_id));
