-- Cars table
create table if not exists cars (
  id          bigint generated always as identity primary key,
  slug        text unique not null,
  model       text not null,
  category    text not null check (category in ('Track','Supercar','Grand Tourer','Electric','Daily')),
  power_hp    int not null,
  seats       int not null,
  fuel        text not null check (fuel in ('Petrol','Hybrid','Electric')),
  rate_zar    int not null,
  color_name  text,
  status      text not null default 'Available' check (status in ('Available','Booked','Service')),
  hero_image  text,
  created_at  timestamptz not null default now()
);

-- Bookings table
create table if not exists bookings (
  id             bigint generated always as identity primary key,
  name           text not null,
  email          text not null,
  phone          text,
  preferred_date date,
  car_interest   text,
  booking_type   text not null check (booking_type in ('Afternoon','Members','Concierge','Event / Film')) default 'Afternoon',
  notes          text,
  status         text not null default 'new' check (status in ('new','confirmed','declined','completed')),
  created_at     timestamptz not null default now()
);

-- RLS
alter table bookings enable row level security;
alter table cars enable row level security;

create policy "anon can insert booking" on bookings for insert to anon with check (true);
create policy "public reads cars"       on cars    for select to anon using (true);

-- Seed cars
insert into cars (slug, model, category, power_hp, seats, fuel, rate_zar, color_name, status) values
  ('porsche-911-gt3',         'Porsche 911 GT3',         'Track',        502, 2, 'Petrol',   38000, 'Shark Blue',     'Available'),
  ('mclaren-720s',            'McLaren 720S',            'Supercar',     710, 2, 'Petrol',   49000, 'Papaya',         'Available'),
  ('aston-martin-db12',       'Aston Martin DB12',       'Grand Tourer', 671, 4, 'Petrol',   30000, 'Ion Green',      'Available'),
  ('lamborghini-huracan-sto', 'Lamborghini Huracán STO', 'Track',        631, 2, 'Petrol',   46000, 'Arancio',        'Booked'),
  ('ferrari-296-gtb',         'Ferrari 296 GTB',         'Supercar',     819, 2, 'Hybrid',   54000, 'Rosso',          'Available'),
  ('bmw-m4-csl',              'BMW M4 CSL',              'Daily',        543, 4, 'Petrol',   14000, 'Frozen Brooklyn','Available'),
  ('porsche-taycan-turbo-s',  'Porsche Taycan Turbo S',  'Electric',     750, 4, 'Electric', 22000, 'Dolomite',       'Available'),
  ('mercedes-amg-gt-black',   'Mercedes-AMG GT Black',   'Track',        720, 2, 'Petrol',   43000, 'Obsidian',       'Service'),
  ('porsche-cayman-gt4-rs',   'Porsche Cayman GT4 RS',   'Track',        493, 2, 'Petrol',   27000, 'Gulf Blue',      'Available'),
  ('audi-r8-v10',             'Audi R8 V10',             'Supercar',     602, 2, 'Petrol',   26000, 'Nardo',          'Available'),
  ('lotus-emira-v6',          'Lotus Emira V6',          'Daily',        400, 2, 'Petrol',   13000, 'Seneca',         'Available')
on conflict (slug) do nothing;
