-- Petrol (93/95 ULP) is price-regulated in South Africa and changes on the first
-- Wednesday of each month. This table is a small, manually-updated calendar of the
-- official price per grade/zone/effective-date — see CLAUDE.md / spec §6. Not scraped.

create table fuel_prices (
  id             uuid primary key default gen_random_uuid(),
  effective_date date not null,
  fuel_type      text not null,   -- '93' | '95' | 'diesel-50' | 'diesel-500'
  price_zone     text not null,   -- 'inland' | 'coastal'
  price_per_l    numeric(6,2) not null,
  created_at     timestamptz not null default now(),

  constraint fuel_prices_fuel_type_valid check (fuel_type in ('93', '95', 'diesel-50', 'diesel-500')),
  constraint fuel_prices_price_zone_valid check (price_zone in ('inland', 'coastal')),
  constraint fuel_prices_unique_entry unique (effective_date, fuel_type, price_zone)
);

alter table fuel_prices enable row level security;

-- Reference data, not user data: any authenticated user may read it, nobody may write
-- it from the client (updated manually via migration or dashboard SQL editor).
create policy "read fuel prices" on fuel_prices
  for select using (auth.role() = 'authenticated');

-- Seed with the July 2026 prices quoted in the spec, so the app has something to show
-- before the first manual update.
insert into fuel_prices (effective_date, fuel_type, price_zone, price_per_l) values
  ('2026-07-01', '95', 'inland',  26.10),
  ('2026-07-01', '95', 'coastal', 25.23),
  ('2026-07-01', '93', 'inland',  25.94),
  ('2026-07-01', '93', 'coastal', 25.07),
  ('2026-07-01', 'diesel-50', 'inland',  25.17),
  ('2026-07-01', 'diesel-50', 'coastal', 24.30);
