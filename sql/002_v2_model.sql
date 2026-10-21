-- Celsius Garantías V2: diseño relacional orientativo para PostgreSQL/Supabase.
-- NO ejecutar sin revisar las migraciones previas y las políticas RLS.
-- Todas las mutaciones sensibles deben ejecutarse mediante API transaccional autorizada.
-- Folios nunca se generan contando filas; bloquear una secuencia por año.
create table if not exists public.folio_counters (
  year_suffix smallint primary key check (year_suffix between 0 and 99),
  next_number integer not null default 100 check (next_number >= 100)
);
-- En una transacción: INSERT ... ON CONFLICT ... DO UPDATE SET next_number=folio_counters.next_number+1
-- RETURNING next_number-1; usar 'FG-' || lpad(num::text,4,'0') || '-' || lpad(year_suffix::text,2,'0').
create table if not exists public.client_accounts (
  user_id uuid primary key references auth.users(id),
  given_name text not null, family_name text not null,
  email text not null, phone_e164 text not null unique,
  street text not null, neighborhood text not null, city text not null,
  state_name text not null, postal_code text not null,
  customer_type text not null check (customer_type in ('individual','business')),
  business_name text,
  email_verified_at timestamptz, whatsapp_verified_at timestamptz,
  transactional_whatsapp_opt_in_at timestamptz,
  opt_in_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.staff_accounts (
  user_id uuid primary key references auth.users(id),
  role text not null check(role in ('master','administrator','supervisor','warranty','logistics','auditor')),
  is_active boolean not null default true,
  invited_by uuid references auth.users(id),
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists only_one_master on public.staff_accounts ((role)) where role='master';
create table if not exists public.warranty_cases_v2 (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null check(folio ~ '^FG-[0-9]{4,}-[0-9]{2}$'),
  client_id uuid not null references public.client_accounts(user_id),
  status text not null default 'draft' check(status in (
    'draft','submitted','in_review','awaiting_customer_confirmation','final_review',
    'approved','rejected','factory_escalated','fulfillment','in_transit',
    'ready_for_pickup','delivered','closed','cancelled')),
  delivery_method text not null default 'parcel',
  pickup_branch text,
  staff_owner uuid references auth.users(id),
  submitted_at timestamptz, created_at timestamptz default now(),
  updated_at timestamptz default now(), revision integer not null default 1
);
create table if not exists public.warranty_parts_v2 (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.warranty_cases_v2(id),
  item_order integer not null,
  equipment_brand text not null, equipment_other_brand text,
  equipment_model text not null, equipment_serial text not null,
  purchase_date date, invoice_reference text,
  part_name text not null, part_number text, failure_description text not null,
  pressure_low_psi numeric, pressure_high_psi numeric,
  voltage_v numeric, amperage_a numeric, ambient_c numeric,
  supply_c numeric, return_c numeric,
  decision text not null default 'pending' check(decision in ('pending','approved','rejected','more_info')),
  decision_reason text, decision_by uuid references auth.users(id),
  decision_at timestamptz, excluded_after_confirmation boolean not null default false,
  unit_cost_internal numeric(14,2),
  unique(case_id,item_order),
  check(equipment_brand <> 'Otra' or nullif(trim(equipment_other_brand),'') is not null)
);
create table if not exists public.warranty_evidence_v2 (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.warranty_parts_v2(id),
  bucket text not null default 'warranty-private',
  object_key text not null unique,
  media_type text not null,
  bytes bigint not null check(bytes>0),
  upload_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);
create table if not exists public.case_confirmations_v2 (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.warranty_cases_v2(id),
  revision integer not null,
  actor_id uuid not null references auth.users(id),
  accepted_item_ids uuid[] not null,
  excluded_item_ids uuid[] not null,
  terms_version text not null,
  created_at timestamptz not null default now(),
  unique(case_id,revision)
);
create table if not exists public.case_events_v2 (
  id bigserial primary key,
  case_id uuid references public.warranty_cases_v2(id),
  actor_id uuid references auth.users(id),
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.notification_outbox_v2 (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.warranty_cases_v2(id),
  recipient_id uuid references auth.users(id),
  channel text not null check(channel in ('whatsapp','email','in_app')),
  template_key text not null, payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique not null,
  status text not null default 'queued', attempt_count integer not null default 0,
  provider_message_id text, provider_status text,
  created_at timestamptz not null default now(), sent_at timestamptz
);
create table if not exists public.conversation_sessions_v2 (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null, verified_user_id uuid references auth.users(id),
  verified_until timestamptz, current_case_id uuid references public.warranty_cases_v2(id),
  handoff_requested boolean not null default false,
  updated_at timestamptz default now()
);
-- Enable RLS immediately. Deliberately NO generic public INSERT/UPDATE/DELETE policies.
alter table public.client_accounts enable row level security;
alter table public.staff_accounts enable row level security;
alter table public.warranty_cases_v2 enable row level security;
alter table public.warranty_parts_v2 enable row level security;
alter table public.warranty_evidence_v2 enable row level security;
alter table public.case_confirmations_v2 enable row level security;
alter table public.case_events_v2 enable row level security;
alter table public.notification_outbox_v2 enable row level security;
alter table public.conversation_sessions_v2 enable row level security;
-- Sample scoped READ policies (production requires grants, migrations and full policy review).
create policy "client_reads_own_profile_v2" on public.client_accounts
for select to authenticated using(user_id=auth.uid());
create policy "client_reads_own_cases_v2" on public.warranty_cases_v2
for select to authenticated using(client_id=auth.uid());
create policy "client_reads_own_parts_v2" on public.warranty_parts_v2
for select to authenticated using(exists(select 1 from public.warranty_cases_v2 c where c.id=case_id and c.client_id=auth.uid()));
-- Privileged server operations must enforce active staff role AND fresh MFA, including revocation,
-- then use narrow dedicated endpoints; never expose service_role/admin API in the browser.
