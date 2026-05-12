-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
create table if not exists public.customers (
  id                      uuid default gen_random_uuid() primary key,
  full_name               text not null,
  email                   text not null unique,
  phone                   text,
  id_number               text,
  drivers_license_number  text,
  drivers_license_expiry  date,
  address                 text,
  created_at              timestamptz default now()
);

alter table public.customers enable row level security;
create policy "Allow all on customers" on public.customers for all using (true) with check (true);

-- ============================================================
-- RENTALS TABLE (full rental records with extras / final amounts)
-- ============================================================
create table if not exists public.rentals (
  id                    uuid default gen_random_uuid() primary key,
  vehicle_id            uuid references public.vehicles(id) on delete set null,
  customer_id           uuid references public.customers(id) on delete set null,
  start_date            date not null,
  end_date              date not null,
  pickup_location       text,
  dropoff_location      text,
  status                text not null default 'pending' check (status in ('pending','confirmed','active','completed','cancelled')),
  total_days            int generated always as (end_date - start_date) stored,
  notes                 text,
  actual_return_date    date,
  extra_charges         int default 0,
  extra_charges_reason  text,
  final_amount          int,
  created_at            timestamptz default now()
);

alter table public.rentals enable row level security;
create policy "Allow all on rentals" on public.rentals for all using (true) with check (true);

-- ============================================================
-- INVOICES TABLE
-- ============================================================
create table if not exists public.invoices (
  id            uuid default gen_random_uuid() primary key,
  rental_id     uuid references public.rentals(id) on delete set null,
  customer_id   uuid references public.customers(id) on delete set null,
  vehicle_id    uuid references public.vehicles(id) on delete set null,
  daily_rate    int not null,
  total_days    int not null,
  subtotal      int not null,
  tax           int not null default 0,
  total_amount  int not null,
  status        text not null default 'unpaid' check (status in ('paid','unpaid','overdue')),
  issued_date   date not null default current_date,
  due_date      date,
  created_at    timestamptz default now()
);

alter table public.invoices enable row level security;
create policy "Allow all on invoices" on public.invoices for all using (true) with check (true);

-- ============================================================
-- TRIGGER: auto-update vehicle status when rental status changes
-- ============================================================
create or replace function sync_vehicle_status()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'active' then
    update public.vehicles set status = 'Booked' where id = NEW.vehicle_id;
  elsif NEW.status in ('completed', 'cancelled') then
    update public.vehicles set status = 'Available' where id = NEW.vehicle_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_vehicle_status on public.rentals;
create trigger trg_sync_vehicle_status
  after insert or update of status on public.rentals
  for each row execute function sync_vehicle_status();

-- ============================================================
-- FUNCTION: dashboard metrics
-- ============================================================
create or replace function dashboard_metrics()
returns json language plpgsql as $$
declare
  result json;
begin
  select json_build_object(
    'total_vehicles',    (select count(*) from public.vehicles),
    'available_vehicles',(select count(*) from public.vehicles where status = 'Available'),
    'booked_vehicles',   (select count(*) from public.vehicles where status = 'Booked'),
    'total_customers',   (select count(*) from public.customers),
    'active_rentals',    (select count(*) from public.rentals where status = 'active'),
    'revenue_mtd',       (select coalesce(sum(total_amount),0) from public.invoices
                          where status = 'paid'
                            and date_trunc('month', created_at) = date_trunc('month', now())),
    'overdue_invoices',  (select count(*) from public.invoices where status = 'overdue'),
    'outstanding_amount',(select coalesce(sum(total_amount),0) from public.invoices where status in ('unpaid','overdue'))
  ) into result;
  return result;
end;
$$;
