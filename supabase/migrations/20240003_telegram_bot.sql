create table if not exists public.telegram_sessions (
  chat_id text primary key,
  step text not null default 'choosing_vehicle',
  telegram_name text,
  telegram_username text,
  selected_vehicle_id text,
  selected_vehicle_model text,
  daily_rate int,
  requested_start_date date,
  requested_days int,
  requested_end_date date,
  total_amount int,
  id_file_id text,
  license_file_id text,
  updated_at timestamptz default now()
);

alter table public.telegram_sessions enable row level security;
create policy "Allow all on telegram_sessions" on public.telegram_sessions for all using (true) with check (true);

create table if not exists public.telegram_leads (
  id uuid default gen_random_uuid() primary key,
  chat_id text not null,
  telegram_name text,
  telegram_username text,
  vehicle_id text,
  vehicle_model text,
  start_date date,
  end_date date,
  total_days int,
  daily_rate int,
  total_amount int,
  id_file_id text,
  license_file_id text,
  status text not null default 'awaiting_payment_confirmation',
  created_at timestamptz default now()
);

alter table public.telegram_leads enable row level security;
create policy "Allow all on telegram_leads" on public.telegram_leads for all using (true) with check (true);
