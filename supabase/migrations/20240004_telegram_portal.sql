 create table if not exists public.telegram_customers (
  id uuid default gen_random_uuid() primary key,
  chat_id text not null unique,
  telegram_name text,
  telegram_username text,
  full_name text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.telegram_customers enable row level security;
create policy "Allow all on telegram_customers" on public.telegram_customers for all using (true) with check (true);

create table if not exists public.telegram_bookings (
  id uuid primary key,
  customer_id uuid references public.telegram_customers(id) on delete set null,
  chat_id text not null,
  vehicle_name text,
  vehicle_category text,
  start_date date,
  total_days int,
  end_date date,
  daily_rate int,
  total_amount int,
  id_file_id text,
  license_file_id text,
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.telegram_bookings enable row level security;
create policy "Allow all on telegram_bookings" on public.telegram_bookings for all using (true) with check (true);

create table if not exists public.telegram_conversations (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.telegram_customers(id) on delete set null,
  chat_id text not null,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text' check (message_type in ('text','photo','document','button')),
  body text,
  meta jsonb,
  created_at timestamptz default now()
);

alter table public.telegram_conversations enable row level security;
create policy "Allow all on telegram_conversations" on public.telegram_conversations for all using (true) with check (true);

create index if not exists telegram_customers_chat_id_idx on public.telegram_customers(chat_id);
create index if not exists telegram_bookings_chat_id_idx on public.telegram_bookings(chat_id);
create index if not exists telegram_conversations_chat_id_idx on public.telegram_conversations(chat_id);
create index if not exists telegram_conversations_customer_id_idx on public.telegram_conversations(customer_id);
