alter table public.telegram_bookings
  add column if not exists hold_expires_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists booking_code text;

update public.telegram_bookings
set booking_code = upper(left(replace(id::text, '-', ''), 8))
where booking_code is null;

update public.telegram_bookings
set hold_expires_at = created_at + interval '24 hours'
where status in ('pending', 'pre_confirmation')
  and hold_expires_at is null;

create index if not exists telegram_bookings_status_idx on public.telegram_bookings(status);
create index if not exists telegram_bookings_hold_expires_at_idx on public.telegram_bookings(hold_expires_at);
create unique index if not exists telegram_bookings_booking_code_idx on public.telegram_bookings(booking_code)
where booking_code is not null;
