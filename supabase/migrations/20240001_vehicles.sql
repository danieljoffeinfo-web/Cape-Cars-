create table if not exists public.vehicles (
  id uuid default gen_random_uuid() primary key,
  model text not null,
  cat text not null check (cat in ('Track', 'Supercar', 'Grand Tourer', 'Electric', 'Daily')),
  power text not null default '',
  seats integer not null default 2,
  fuel text not null check (fuel in ('Petrol', 'Hybrid', 'Electric')),
  rate integer not null default 0,
  status text not null default 'Available' check (status in ('Available', 'Booked', 'Service')),
  color text not null default '',
  description text default '',
  image_url text default null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.vehicles enable row level security;
create policy "Allow all" on public.vehicles for all using (true) with check (true);

insert into storage.buckets (id, name, public) values ('vehicles', 'vehicles', true) on conflict do nothing;

create policy "Public read vehicles" on storage.objects for select using (bucket_id = 'vehicles');
create policy "Allow upload vehicles" on storage.objects for insert with check (bucket_id = 'vehicles');
create policy "Allow update vehicles" on storage.objects for update using (bucket_id = 'vehicles');
create policy "Allow delete vehicles" on storage.objects for delete using (bucket_id = 'vehicles');
