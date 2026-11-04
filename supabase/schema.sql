-- GS Gestão Clínica — esquema do banco (Supabase / Postgres)
-- Rodar uma vez no Supabase: SQL Editor > New query > colar tudo > Run.
-- Multi-clínica: cada clínica só enxerga os próprios dados (Row Level Security).
-- Perfis: agency (você, vê todas), owner (dono, vê tudo da clínica), secretary (operação, sem financeiro/marketing).

-- ============ TIPOS ============
create type member_role as enum ('owner', 'secretary');
create type lead_source as enum ('meta', 'organic', 'referral', 'google', 'other');
create type event_type as enum ('created', 'message', 'stage_change', 'scheduled', 'reminder', 'attended', 'quote', 'closed', 'lost', 'note');

-- ============ TABELAS ============
create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  fixed_fee numeric(12,2) default 0,          -- seu fixo mensal
  variable_pct numeric(5,2) default 10,       -- % sobre dinheiro novo
  baseline_revenue numeric(12,2) default 0,   -- média dos 3 meses antes do contrato
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_agency boolean default false,
  created_at timestamptz default now()
);

create table clinic_members (
  clinic_id uuid references clinics(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role member_role not null,
  primary key (clinic_id, user_id)
);

create table pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  position int not null,
  is_won boolean default false,
  is_lost boolean default false
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  stage_id uuid references pipeline_stages(id) on delete set null,
  owner_id uuid references profiles(id) on delete set null,
  name text not null,
  phone text,
  email text,
  source lead_source default 'other',
  campaign text,
  creative text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  procedure text,
  quote_value numeric(12,2),
  closed_value numeric(12,2),
  lost_reason text,
  notes text,
  tags text[] default '{}',
  first_response_seconds int,                 -- tempo até a primeira resposta
  last_contact_at timestamptz,
  scheduled_at timestamptz,                   -- data da avaliação
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on leads (clinic_id, stage_id);
create index on leads (clinic_id, created_at);
create index on leads (clinic_id, phone);

create table lead_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  type event_type not null,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index on lead_events (lead_id, created_at desc);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  done boolean default false,
  assigned_to uuid references auth.users(id),
  created_at timestamptz default now()
);
create index on tasks (clinic_id, done, due_at);

-- Investimento em mídia por dia/campanha/criativo (para a tela de Marketing)
create table ad_spend (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  date date not null,
  platform text default 'meta',
  campaign text,
  creative text,
  spend numeric(12,2) not null default 0
);
create index on ad_spend (clinic_id, date);

-- ============ FUNÇÕES DE PERMISSÃO ============
create or replace function is_agency() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_agency from profiles where id = auth.uid()), false);
$$;

create or replace function member_role_of(cid uuid) returns member_role
language sql stable security definer set search_path = public as $$
  select role from clinic_members where clinic_id = cid and user_id = auth.uid();
$$;

create or replace function can_see_clinic(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_agency() or member_role_of(cid) is not null;
$$;

create or replace function can_see_finance(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_agency() or member_role_of(cid) = 'owner';
$$;

-- ============ RLS ============
alter table clinics enable row level security;
alter table profiles enable row level security;
alter table clinic_members enable row level security;
alter table pipeline_stages enable row level security;
alter table leads enable row level security;
alter table lead_events enable row level security;
alter table tasks enable row level security;
alter table ad_spend enable row level security;

create policy clinics_select on clinics for select using (can_see_clinic(id));
create policy clinics_write on clinics for all using (is_agency()) with check (is_agency());

create policy profiles_self on profiles for select using (id = auth.uid() or is_agency());
create policy profiles_update_self on profiles for update using (id = auth.uid());

create policy members_select on clinic_members for select using (user_id = auth.uid() or can_see_finance(clinic_id));
create policy members_write on clinic_members for all using (is_agency()) with check (is_agency());

create policy stages_select on pipeline_stages for select using (can_see_clinic(clinic_id));
create policy stages_write on pipeline_stages for all using (can_see_finance(clinic_id)) with check (can_see_finance(clinic_id));

create policy leads_all on leads for all using (can_see_clinic(clinic_id)) with check (can_see_clinic(clinic_id));
create policy events_all on lead_events for all using (can_see_clinic(clinic_id)) with check (can_see_clinic(clinic_id));
create policy tasks_all on tasks for all using (can_see_clinic(clinic_id)) with check (can_see_clinic(clinic_id));

-- Marketing: só agência (e dono pode ver)
create policy adspend_select on ad_spend for select using (can_see_finance(clinic_id));
create policy adspend_write on ad_spend for all using (is_agency()) with check (is_agency());

-- ============ AUTOMATISMOS ============
-- Cria o perfil quando um usuário se cadastra
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Cria as 6 etapas padrão quando uma clínica nasce
create or replace function seed_stages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into pipeline_stages (clinic_id, name, position, is_won, is_lost) values
    (new.id, 'Lead novo', 1, false, false),
    (new.id, 'Em atendimento', 2, false, false),
    (new.id, 'Avaliação agendada', 3, false, false),
    (new.id, 'Compareceu', 4, false, false),
    (new.id, 'Orçamento enviado', 5, false, false),
    (new.id, 'Fechou', 6, true, false),
    (new.id, 'Perdido', 7, false, true);
  return new;
end $$;
create trigger on_clinic_created after insert on clinics
  for each row execute function seed_stages();

-- Registra no histórico toda mudança de etapa e marca data de fechamento
create or replace function log_stage_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare st pipeline_stages;
begin
  new.updated_at := now();
  if new.stage_id is distinct from old.stage_id then
    select * into st from pipeline_stages where id = new.stage_id;
    insert into lead_events (clinic_id, lead_id, type, description, created_by)
      values (new.clinic_id, new.id, 'stage_change', 'Movido para ' || coalesce(st.name, '—'), auth.uid());
    if st.is_won and new.closed_at is null then new.closed_at := now(); end if;
  end if;
  return new;
end $$;
create trigger on_lead_update before update on leads
  for each row execute function log_stage_change();

create or replace function log_lead_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into lead_events (clinic_id, lead_id, type, description, created_by)
    values (new.clinic_id, new.id, 'created', 'Lead criado (' || new.source || ')', auth.uid());
  return new;
end $$;
create trigger on_lead_insert after insert on leads
  for each row execute function log_lead_created();

-- ============ VISÃO DO PAINEL (mês corrente) ============
create or replace view clinic_month_stats with (security_invoker = true) as
select
  c.id as clinic_id,
  c.name,
  count(l.*) filter (where l.created_at >= date_trunc('month', now())) as leads_month,
  avg(l.first_response_seconds) filter (where l.created_at >= date_trunc('month', now())) as avg_response_seconds,
  count(l.*) filter (where l.scheduled_at >= date_trunc('month', now())) as scheduled_month,
  count(l.*) filter (where l.closed_at >= date_trunc('month', now())) as closed_month,
  coalesce(sum(l.closed_value) filter (where l.closed_at >= date_trunc('month', now())), 0) as revenue_month,
  c.baseline_revenue,
  greatest(coalesce(sum(l.closed_value) filter (where l.closed_at >= date_trunc('month', now())), 0) - c.baseline_revenue, 0) as new_money,
  c.fixed_fee,
  c.variable_pct
from clinics c
left join leads l on l.clinic_id = c.id
group by c.id;

-- ============ DEPOIS DE RODAR ============
-- 1) Crie seu usuário em Authentication > Users.
-- 2) Rode, trocando o e-mail:  update profiles set is_agency = true where id = (select id from auth.users where email = 'SEU_EMAIL');

-- ============ FATURAMENTO TOTAL INFORMADO PELO DONO (base do variável) ============
create table clinic_monthly_revenue (
  clinic_id uuid references clinics(id) on delete cascade,
  month date not null,                         -- sempre o dia 1 do mês
  revenue numeric(12,2) not null default 0,
  primary key (clinic_id, month)
);
alter table clinic_monthly_revenue enable row level security;
create policy revenue_select on clinic_monthly_revenue for select using (can_see_finance(clinic_id));
create policy revenue_write on clinic_monthly_revenue for all using (can_see_finance(clinic_id)) with check (can_see_finance(clinic_id));

-- Nomes de colegas da mesma clínica (para mostrar o responsável do lead)
create or replace function shares_clinic(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from clinic_members a join clinic_members b on a.clinic_id = b.clinic_id
                 where a.user_id = auth.uid() and b.user_id = uid);
$$;
create policy profiles_same_clinic on profiles for select using (shares_clinic(id));
