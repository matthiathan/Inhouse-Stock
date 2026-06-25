-- Enterprise stabilization migration for project xwdltghqqaobsgefrczy.
-- Review and run against a backed-up staging database before production.
-- Non-destructive: creates additive tables/functions/indexes, tightens RLS,
-- and bootstraps public.machines from legacy public.fam where no machine exists.

create extension if not exists "pgcrypto";

do $$
begin
  alter type public.app_role add value if not exists 'warehouse_staff';
exception when duplicate_object then null;
end $$;

do $$
begin
  alter type public.app_role add value if not exists 'driver';
exception when duplicate_object then null;
end $$;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create or replace function app_private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select u.role::text
      from public.users u
      where u.id = (select auth.uid())
      limit 1
    ),
    'anon'
  );
$$;

create or replace function app_private.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_user_role() = any(allowed_roles);
$$;

revoke all on function app_private.current_user_role() from public, anon;
revoke all on function app_private.has_role(text[]) from public, anon;
grant execute on function app_private.current_user_role() to authenticated;
grant execute on function app_private.has_role(text[]) to authenticated;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text null,
  old_values jsonb null,
  new_values jsonb null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_section_history (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  previous_section_id bigint null references public.section(id) on delete set null,
  new_section_id bigint null references public.section(id) on delete set null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  reason text null,
  changed_at timestamptz not null default now()
);

create table if not exists public.warehouse_transactions (
  id uuid primary key default gen_random_uuid(),
  stock_id bigint not null references public.stock(id) on delete restrict,
  user_id uuid null references auth.users(id) on delete set null,
  type text not null check (type in ('RECEIVE', 'DISPATCH', 'TRANSFER', 'ADJUST', 'ARCHIVE')),
  quantity_change integer not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  reference_number text null,
  notes text null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_fulfillment_scans (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  order_id uuid null references public.orders(id) on delete cascade,
  scanned_by uuid not null references auth.users(id) on delete restrict,
  idempotency_key text null unique,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
alter table public.asset_section_history enable row level security;
alter table public.warehouse_transactions enable row level security;
alter table public.order_fulfillment_scans enable row level security;
alter table public.stock enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.machines enable row level security;
alter table public.customers enable row level security;
alter table public.fam enable row level security;
alter table public.section enable row level security;

do $$
declare
  policy_to_drop record;
begin
  for policy_to_drop in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'audit_logs',
        'asset_section_history',
        'customers',
        'fam',
        'machines',
        'order_fulfillment_scans',
        'order_items',
        'orders',
        'section',
        'stock',
        'warehouse_transactions'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_to_drop.policyname,
      policy_to_drop.schemaname,
      policy_to_drop.tablename
    );
  end loop;
end $$;

revoke all on public.audit_logs from anon;
revoke all on public.asset_section_history from anon;
revoke all on public.customers from anon;
revoke all on public.fam from anon;
revoke all on public.machines from anon;
revoke all on public.order_fulfillment_scans from anon;
revoke all on public.order_items from anon;
revoke all on public.orders from anon;
revoke all on public.section from anon;
revoke all on public.stock from anon;
revoke all on public.warehouse_transactions from anon;

grant select on public.customers, public.fam, public.machines, public.section to authenticated;
grant select on public.stock, public.orders, public.order_items to authenticated;
grant select on public.audit_logs, public.asset_section_history, public.warehouse_transactions, public.order_fulfillment_scans to authenticated;
grant insert, update on public.stock, public.orders, public.order_items to authenticated;
grant insert, update on public.machines to authenticated;
grant insert on public.audit_logs, public.asset_section_history, public.warehouse_transactions, public.order_fulfillment_scans to authenticated;

create policy "authenticated can read fam"
on public.fam for select to authenticated
using (true);

create policy "asset operators can write fam"
on public.fam for insert to authenticated
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "asset operators can update fam"
on public.fam for update to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']))
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "authenticated can read sections"
on public.section for select to authenticated
using (true);

create policy "asset readers can read machines"
on public.machines for select to authenticated
using (
  app_private.has_role(array[
    'admin',
    'ops_manager',
    'warehouse',
    'warehouse_staff',
    'driver',
    'tech',
    'road_tech',
    'finance',
    'user'
  ])
);

create policy "asset operators can insert machines"
on public.machines for insert to authenticated
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "asset operators can update machines"
on public.machines for update to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']))
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "operations can read customers"
on public.customers for select to authenticated
using (
  app_private.has_role(array[
    'admin',
    'ops_manager',
    'warehouse',
    'warehouse_staff',
    'driver',
    'tech',
    'road_tech',
    'finance'
  ])
);

create policy "warehouse roles can read stock"
on public.stock for select to authenticated
using (
  is_active is true
  and app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff', 'finance'])
);

create policy "warehouse roles can insert stock"
on public.stock for insert to authenticated
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "warehouse roles can update stock"
on public.stock for update to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']))
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "admin can delete stock"
on public.stock for delete to authenticated
using (app_private.has_role(array['admin']));

create policy "operations can read orders"
on public.orders for select to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff', 'finance']));

create policy "operations can write orders"
on public.orders for insert to authenticated
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "operations can update orders"
on public.orders for update to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']))
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "operations can read order items"
on public.order_items for select to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff', 'finance']));

create policy "operations can write order items"
on public.order_items for insert to authenticated
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "operations can update order items"
on public.order_items for update to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']))
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "operations can read warehouse transactions"
on public.warehouse_transactions for select to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff', 'finance']));

create policy "system can insert warehouse transactions"
on public.warehouse_transactions for insert to authenticated
with check (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "operations can read fulfillment scans"
on public.order_fulfillment_scans for select to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff', 'finance']));

create policy "operations can insert fulfillment scans"
on public.order_fulfillment_scans for insert to authenticated
with check (scanned_by = (select auth.uid()) and app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "operations can read section history"
on public.asset_section_history for select to authenticated
using (app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff', 'finance']));

create policy "operations can insert section history"
on public.asset_section_history for insert to authenticated
with check (changed_by = (select auth.uid()) and app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']));

create policy "admins can read audit logs"
on public.audit_logs for select to authenticated
using (app_private.has_role(array['admin', 'ops_manager']));

create policy "authenticated can insert audit logs"
on public.audit_logs for insert to authenticated
with check (actor_id = (select auth.uid()) or actor_id is null);

insert into public.machines (fam_id, qr_code, serial_number)
select
  f.id,
  nullif(trim(f."QR Code"), ''),
  nullif(trim(f."Serial#"), '')
from public.fam f
where nullif(trim(f."QR Code"), '') is not null
  and not exists (
    select 1
    from public.machines m
    where m.fam_id = f.id
       or m.qr_code = nullif(trim(f."QR Code"), '')
  )
on conflict do nothing;

create or replace view public.v_machine_details
with (security_invoker = true)
as
select
  m.id as machine_id,
  m.fam_id,
  coalesce(m.serial_number, f."Serial#") as serial_number,
  coalesce(m.qr_code, f."QR Code") as qr_code,
  coalesce(f."Asset Name", f."Machine Model", m.serial_number, m.qr_code) as asset_name,
  'Operational'::text as machine_status,
  f."Asset Number" as asset_number,
  f."Machine Type" as machine_type,
  f."Machine Model" as model_name,
  null::text as manufacturer,
  null::text as category,
  m.section_id,
  s.section_name,
  null::uuid as customer_id,
  f."C.Code" as customer_code,
  f."Current Customer Name" as customer_name,
  null::text as customer_region,
  null::uuid as contract_id,
  f."Contract#" as contract_number,
  f."Contr. Type" as contract_type,
  f."Current Location" as current_location,
  f."Current Bldg Name" as building_name,
  m.created_at,
  m.updated_at
from public.machines m
join public.fam f on f.id = m.fam_id
left join public.section s on s.id = m.section_id;

create or replace function public.record_warehouse_transaction(
  p_stock_id bigint,
  p_user_id uuid,
  p_type text,
  p_quantity_change integer,
  p_reference_number text default null,
  p_notes text default null
)
returns public.stock
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stock public.stock;
  v_previous_quantity integer;
  v_new_quantity integer;
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']) then
    raise exception 'Insufficient warehouse permissions' using errcode = '42501';
  end if;

  if p_type not in ('RECEIVE', 'DISPATCH', 'TRANSFER', 'ADJUST', 'ARCHIVE') then
    raise exception 'Invalid warehouse transaction type';
  end if;

  select * into v_stock
  from public.stock
  where id = p_stock_id
  for update;

  if not found then
    raise exception 'Stock item not found';
  end if;

  v_previous_quantity := coalesce(v_stock.quantity, 0);
  v_new_quantity := v_previous_quantity + p_quantity_change;

  if v_new_quantity < 0 then
    raise exception 'Insufficient stock available';
  end if;

  update public.stock
  set quantity = v_new_quantity
  where id = p_stock_id
  returning * into v_stock;

  insert into public.warehouse_transactions (
    stock_id,
    user_id,
    type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reference_number,
    notes
  )
  values (
    p_stock_id,
    v_actor,
    p_type,
    p_quantity_change,
    v_previous_quantity,
    v_new_quantity,
    p_reference_number,
    p_notes
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values, metadata)
  values (
    v_actor,
    'stock.transaction',
    'stock',
    p_stock_id::text,
    jsonb_build_object('quantity', v_previous_quantity),
    jsonb_build_object('quantity', v_new_quantity),
    jsonb_build_object('type', p_type, 'reference_number', p_reference_number)
  );

  return v_stock;
end;
$$;

create or replace function public.fulfill_order_item(
  p_order_item_id uuid,
  p_quantity integer default 1,
  p_idempotency_key text default null
)
returns public.order_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.order_items;
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']) then
    raise exception 'Insufficient fulfilment permissions' using errcode = '42501';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  if p_idempotency_key is not null then
    select oi.* into v_item
    from public.order_fulfillment_scans scan
    join public.order_items oi on oi.id = scan.order_item_id
    where scan.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return v_item;
    end if;
  end if;

  select * into v_item
  from public.order_items
  where id = p_order_item_id
  for update;

  if not found then
    raise exception 'Order item not found';
  end if;

  if coalesce(v_item.scanned_quantity, 0) + p_quantity > v_item.required_quantity then
    raise exception 'Scan would exceed required quantity';
  end if;

  update public.order_items
  set
    scanned_quantity = coalesce(scanned_quantity, 0) + p_quantity,
    is_fulfilled = (coalesce(scanned_quantity, 0) + p_quantity) >= required_quantity
  where id = p_order_item_id
  returning * into v_item;

  insert into public.order_fulfillment_scans (
    order_item_id,
    order_id,
    scanned_by,
    idempotency_key,
    quantity
  )
  values (
    v_item.id,
    v_item.order_id,
    v_actor,
    p_idempotency_key,
    p_quantity
  );

  return v_item;
end;
$$;

create or replace function public.change_machine_section(
  p_machine_id uuid,
  p_new_section_id bigint,
  p_reason text default null
)
returns public.machines
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_machine public.machines;
  v_previous_section_id bigint;
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']) then
    raise exception 'Insufficient asset movement permissions' using errcode = '42501';
  end if;

  select * into v_machine
  from public.machines
  where id = p_machine_id
  for update;

  if not found then
    raise exception 'Machine not found';
  end if;

  if v_machine.section_id is not distinct from p_new_section_id then
    raise exception 'New section must differ from current section';
  end if;

  if p_new_section_id is not null and not exists (select 1 from public.section where id = p_new_section_id) then
    raise exception 'Section not found';
  end if;

  v_previous_section_id := v_machine.section_id;

  update public.machines
  set
    section_id = p_new_section_id,
    updated_at = now()
  where id = p_machine_id
  returning * into v_machine;

  insert into public.asset_section_history (
    machine_id,
    previous_section_id,
    new_section_id,
    changed_by,
    reason
  )
  values (
    p_machine_id,
    v_previous_section_id,
    p_new_section_id,
    v_actor,
    p_reason
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values, metadata)
  values (
    v_actor,
    'asset.section_changed',
    'machines',
    p_machine_id::text,
    jsonb_build_object('section_id', v_previous_section_id),
    jsonb_build_object('section_id', p_new_section_id),
    jsonb_build_object('reason', p_reason)
  );

  return v_machine;
end;
$$;

create or replace function public.complete_order_transaction(order_id_param uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_item record;
  v_stock public.stock;
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not app_private.has_role(array['admin', 'ops_manager', 'warehouse', 'warehouse_staff']) then
    raise exception 'Insufficient order completion permissions' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = order_id_param
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if coalesce(v_order.status, '') in ('Fulfilled', 'Completed') then
    return;
  end if;

  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = order_id_param
      and coalesce(oi.scanned_quantity, 0) < oi.required_quantity
  ) then
    raise exception 'Order has unfulfilled line items';
  end if;

  for v_item in
    select *
    from public.order_items
    where order_id = order_id_param
    order by id
  loop
    select * into v_stock
    from public.stock
    where barcode = v_item.stock_barcode
    for update;

    if not found then
      raise exception 'Stock item not found for barcode %', v_item.stock_barcode;
    end if;

    if coalesce(v_stock.quantity, 0) < v_item.required_quantity then
      raise exception 'Insufficient stock for barcode %', v_item.stock_barcode;
    end if;

    update public.stock
    set quantity = coalesce(quantity, 0) - v_item.required_quantity
    where id = v_stock.id
    returning * into v_stock;

    insert into public.warehouse_transactions (
      stock_id,
      user_id,
      type,
      quantity_change,
      previous_quantity,
      new_quantity,
      reference_number,
      notes
    )
    values (
      v_stock.id,
      v_actor,
      'DISPATCH',
      -v_item.required_quantity,
      v_stock.quantity + v_item.required_quantity,
      v_stock.quantity,
      v_order.order_number,
      'Order completion'
    );
  end loop;

  update public.order_items
  set is_fulfilled = true
  where order_id = order_id_param;

  update public.orders
  set
    status = 'Fulfilled',
    completed_at = now()
  where id = order_id_param;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, new_values)
  values (
    v_actor,
    'order.completed',
    'orders',
    order_id_param::text,
    jsonb_build_object('status', 'Fulfilled')
  );
end;
$$;

revoke all on function public.record_warehouse_transaction(bigint, uuid, text, integer, text, text) from public, anon;
revoke all on function public.fulfill_order_item(uuid, integer, text) from public, anon;
revoke all on function public.change_machine_section(uuid, bigint, text) from public, anon;
revoke all on function public.complete_order_transaction(uuid) from public, anon;
grant execute on function public.record_warehouse_transaction(bigint, uuid, text, integer, text, text) to authenticated;
grant execute on function public.fulfill_order_item(uuid, integer, text) to authenticated;
grant execute on function public.change_machine_section(uuid, bigint, text) to authenticated;
grant execute on function public.complete_order_transaction(uuid) to authenticated;

do $$
begin
  revoke execute on function public.decrement_stock(integer, integer) from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.deduct_stock_for_order(uuid) from public, anon, authenticated;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.has_role(text) from public, anon;
exception when undefined_function then null;
end $$;

do $$
begin
  revoke execute on function public.on_order_status_update() from public, anon, authenticated;
exception when undefined_function then null;
end $$;

create index if not exists idx_machines_fam_id on public.machines(fam_id);
create index if not exists idx_machines_section_id on public.machines(section_id);
create index if not exists idx_machines_qr_code on public.machines(qr_code);
create index if not exists idx_stock_sku on public.stock(sku);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_stock_barcode on public.order_items(stock_barcode);
create index if not exists idx_maintenance_tickets_machine_id on public.maintenance_tickets(machine_id);
create index if not exists idx_maintenance_tickets_tech_id on public.maintenance_tickets(tech_id);
create index if not exists idx_service_call_logs_assigned_employee_id on public.service_call_logs(assigned_employee_id);
create index if not exists idx_service_call_logs_customer_id on public.service_call_logs(customer_id);
create index if not exists idx_service_call_logs_qrcode on public.service_call_logs("QRCODE");
create index if not exists idx_warehouse_transactions_stock_created on public.warehouse_transactions(stock_id, created_at desc);
create index if not exists idx_asset_section_history_machine_changed on public.asset_section_history(machine_id, changed_at desc);

do $$
begin
  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'stock'
      and indexname = 'idx_stock_barcode_search'
  ) then
    drop index public.idx_stock_barcode_search;
  end if;
end $$;
