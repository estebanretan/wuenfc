-- CELSIUS / Supabase PostgreSQL — BASE DE ESQUEMA (no ejecutar sin revisar y probar en staging)
-- Security model: clients cannot self-assign corporate roles. Private-case rows are protected with RLS.
create extension if not exists pgcrypto;
create type public.account_role as enum ('client','warranty','supervisor','administrator','master','logistics','auditor');
create type public.case_status as enum ('draft','submitted','in_review','info_requested','partial_client_action','final_review','approved','rejected','factory','preparing','shipped','pickup_ready','delivered','closed');
create type public.item_decision as enum ('pending','approved','rejected','factory');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role public.account_role not null default 'client',
 full_name text not null default '', email text not null default '', phone text,
 customer_type text check (customer_type in ('individual','business')),
 business_name text, tax_id text, city text, region text,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.brands(id uuid primary key default gen_random_uuid(),name text unique not null);
create table public.equipment_models(id uuid primary key default gen_random_uuid(),brand_id uuid references public.brands, model text not null, family text, indoor_model text, outdoor_model text);
create table public.parts(id uuid primary key default gen_random_uuid(),sku text unique not null,name text not null,internal_cost numeric(12,2) not null default 0, active boolean not null default true);
create table public.equipment_part_compatibility(equipment_id uuid references public.equipment_models on delete cascade,part_id uuid references public.parts on delete cascade,primary key(equipment_id,part_id));
create table public.warranty_cases (
 id uuid primary key default gen_random_uuid(), folio bigint generated always as identity unique,
 customer_id uuid not null references public.profiles(id),
 model_id uuid references public.equipment_models(id),
 model_text text, serial_number text, invoice_number text, invoice_date date,
 fault_description text, region text,
 measurements jsonb not null default '{}'::jsonb,
 status public.case_status not null default 'draft',
 original_case_id uuid references public.warranty_cases(id),
 delivery_confirmed_at timestamptz,
 submitted_at timestamptz, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.warranty_items (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.warranty_cases(id) on delete cascade,
 part_id uuid references public.parts(id), part_name text not null, part_number text,
 quantity int not null check(quantity>0), fault_description text,
 decision public.item_decision not null default 'pending',
 decision_reason text, decision_at timestamptz, reviewed_by uuid references public.profiles(id),
 excluded_after_confirmation boolean not null default false
);
create table public.case_files (
 id uuid primary key default gen_random_uuid(),case_id uuid not null references public.warranty_cases(id) on delete cascade,
 item_id uuid references public.warranty_items(id),uploaded_by uuid not null references public.profiles(id),
 category text not null,storage_path text not null unique,mime_type text,bytes bigint,
 created_at timestamptz not null default now()
);
create table public.case_events (
 id bigint generated always as identity primary key,case_id uuid not null references public.warranty_cases(id) on delete cascade,
 actor_id uuid references public.profiles(id),event_type text not null, old_value jsonb,new_value jsonb,
 description text, created_at timestamptz not null default now()
);
create table public.case_messages (
 id uuid primary key default gen_random_uuid(),case_id uuid not null references public.warranty_cases(id) on delete cascade,
 sender_id uuid not null references public.profiles(id),body text not null check(length(body)<=4000),
 visible_to_client boolean not null default true,created_at timestamptz not null default now()
);
create table public.case_shipments (
 id uuid primary key default gen_random_uuid(),case_id uuid not null references public.warranty_cases(id),
 fulfillment text not null check(fulfillment in ('courier','pickup')),pickup_branch text,
 carrier text,tracking_number text,returned_damaged_part boolean not null default false,
 shipped_at timestamptz,delivered_at timestamptz,created_at timestamptz not null default now()
);
create table public.case_confirmations (
 id uuid primary key default gen_random_uuid(),case_id uuid not null references public.warranty_cases(id),
 customer_id uuid not null references public.profiles(id), action text not null,
 snapshot jsonb not null,confirmed_at timestamptz not null default now()
);
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(),case_id uuid references public.warranty_cases(id),
 recipient_id uuid references public.profiles(id), channel text not null check(channel in ('email','whatsapp','inapp')),
 template text not null,payload jsonb not null default '{}',status text not null default 'queued',
 attempt_count int not null default 0, created_at timestamptz not null default now(),sent_at timestamptz
);
-- On sign-up: force client role regardless of any user metadata. Never accept role or status from a client request.
create or replace function public.new_customer_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,role,full_name,email,phone,customer_type,business_name,tax_id,city,region)
 values(new.id,'client',coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.email,''),new.raw_user_meta_data->>'phone',
 case when new.raw_user_meta_data->>'customer_type'='business' then 'business' else 'individual' end,
 new.raw_user_meta_data->>'business_name',new.raw_user_meta_data->>'tax_id',new.raw_user_meta_data->>'city',new.raw_user_meta_data->>'region');
 return new;
end $$;
create trigger after_auth_signup after insert on auth.users for each row execute function public.new_customer_profile();
-- SECURITY: helper reads DB roles rather than trusting user-editable JWT metadata.
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('warranty','supervisor','administrator','master','logistics','auditor') and is_active)
$$;
create or replace function public.is_master() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='master' and is_active)
$$;
-- Corporate access requires a verified authenticator session (MFA AAL2).
create or replace function public.staff_mfa_ok() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_staff() and coalesce((select auth.jwt()->>'aal'),'')='aal2'
$$;
-- Permit client to read their case; staff may read with verified MFA.
create or replace function public.can_read_case(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.warranty_cases c where c.id=target and (c.customer_id=(select auth.uid()) or public.staff_mfa_ok()))
$$;
-- Apply RLS to all sensitive tables. Default deny writes; production uses audited server endpoints / RPC.
alter table public.profiles enable row level security;
alter table public.warranty_cases enable row level security;
alter table public.warranty_items enable row level security;
alter table public.case_files enable row level security;
alter table public.case_events enable row level security;
alter table public.case_messages enable row level security;
alter table public.case_shipments enable row level security;
alter table public.case_confirmations enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.brands enable row level security;
alter table public.equipment_models enable row level security;
alter table public.parts enable row level security;
alter table public.equipment_part_compatibility enable row level security;
create policy profiles_select on public.profiles for select to authenticated using (id=(select auth.uid()) or public.staff_mfa_ok());
create policy cases_select on public.warranty_cases for select to authenticated using (customer_id=(select auth.uid()) or public.staff_mfa_ok());
create policy items_select on public.warranty_items for select to authenticated using (public.can_read_case(case_id));
create policy files_select on public.case_files for select to authenticated using (public.can_read_case(case_id));
create policy events_select on public.case_events for select to authenticated using (public.staff_mfa_ok()); -- internal audit only; publish sanitized customer timeline separately
create policy messages_select on public.case_messages for select to authenticated using (public.can_read_case(case_id) and (visible_to_client or public.staff_mfa_ok()));
create policy shipments_select on public.case_shipments for select to authenticated using (public.can_read_case(case_id));
create policy confirmations_select on public.case_confirmations for select to authenticated using (public.can_read_case(case_id));
create policy brands_select on public.brands for select to authenticated using (true);
create policy equipment_select on public.equipment_models for select to authenticated using (true);
create policy parts_select on public.parts for select to authenticated using (public.staff_mfa_ok());
create policy compatibility_select on public.equipment_part_compatibility for select to authenticated using (true);
-- No policies for notification_outbox. No direct client write policies by design.
-- SECURITY NOTE: Only a manually verified operator can bootstrap ONE master account.
create unique index exactly_one_master on public.profiles((role)) where role='master';
-- CRITICAL: do not insert a master ID into source code; provisioning is performed in a private DB admin session.
-- IMPORTANT: this schema is a starter; backend services/RPC transactions, file storage RLS,
-- state machine enforcement, email verification, rate limits and security tests are still required.
