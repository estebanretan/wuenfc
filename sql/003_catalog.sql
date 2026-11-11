-- Celsius · Catálogo multimarca (propuesta). Revisar junto con 001/002 antes de ejecutar en staging.
create table if not exists public.catalog_brands(
  id uuid primary key default gen_random_uuid(), name text unique not null, active boolean not null default true,
  created_at timestamptz not null default now());
create table if not exists public.catalog_imports(
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.catalog_brands(id),
  file_name text not null, file_sha256 text not null, mode text not null check(mode in('replace','merge')),
  rows_read int not null, rows_ok int not null, rows_error int not null, report jsonb not null default '{}',
  imported_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table if not exists public.catalog_systems(
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.catalog_brands(id),
  system_key text not null, model text, description text, family text, equipment_type text, technology text,
  function text, refrigerant text, capacity_tr numeric(5,2), voltage text, active boolean not null default true,
  import_id uuid references public.catalog_imports(id), unique(brand_id,system_key));
create table if not exists public.catalog_units(
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.catalog_brands(id),
  code text not null, role text not null check(role in('evaporadora','condensadora')), description text,
  unique(brand_id,code));
create table if not exists public.catalog_system_units(
  system_id uuid references public.catalog_systems(id) on delete cascade,
  unit_id uuid references public.catalog_units(id) on delete cascade, primary key(system_id,unit_id));
create table if not exists public.catalog_parts(
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.catalog_brands(id),
  part_number text not null, description text not null, category text, internal_cost numeric(12,2),
  active boolean not null default true, unique(brand_id,part_number));
create table if not exists public.catalog_unit_parts(
  unit_id uuid references public.catalog_units(id) on delete cascade,
  part_id uuid references public.catalog_parts(id) on delete cascade, primary key(unit_id,part_id));
alter table public.catalog_brands enable row level security;
alter table public.catalog_imports enable row level security;
alter table public.catalog_systems enable row level security;
alter table public.catalog_units enable row level security;
alter table public.catalog_system_units enable row level security;
alter table public.catalog_parts enable row level security;
alter table public.catalog_unit_parts enable row level security;
-- Lectura para usuarios autenticados (el costo interno debe exponerse solo vía vista/endpoint de staff).
create policy cat_brands_read on public.catalog_brands for select to authenticated using(active);
create policy cat_systems_read on public.catalog_systems for select to authenticated using(active);
create policy cat_units_read on public.catalog_units for select to authenticated using(true);
create policy cat_sys_units_read on public.catalog_system_units for select to authenticated using(true);
create policy cat_parts_read on public.catalog_parts for select to authenticated using(active);
create policy cat_unit_parts_read on public.catalog_unit_parts for select to authenticated using(true);
-- Sin políticas de escritura: las importaciones se hacen desde un endpoint de servidor (administrador + MFA).
