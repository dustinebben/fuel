-- Vehicles and fill-ups: the core schema. Targets Neon with Managed Better Auth, whose
-- users live in neon_auth."user" (uuid ids). Apply the files in order to an empty database.

create table vehicles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references neon_auth."user"(id) on delete cascade,
  name            text not null,
  make            text,
  model           text,
  year            int,
  tank_capacity_l numeric(5,2),
  fuel_type       text not null default '95',      -- '93' | '95' | 'diesel-50' | 'diesel-500'
  price_zone      text not null default 'inland',  -- 'inland' | 'coastal'
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),

  constraint fuel_type_valid check (fuel_type in ('93', '95', 'diesel-50', 'diesel-500')),
  constraint price_zone_valid check (price_zone in ('inland', 'coastal'))
);

create table fill_ups (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references neon_auth."user"(id) on delete cascade,
  vehicle_id            uuid not null references vehicles(id) on delete cascade,

  filled_at             timestamptz not null default now(),

  odometer_km           numeric(9,1) not null,
  litres                numeric(6,2) not null,
  total_cost            numeric(9,2) not null,
  computer_l_per_100km  numeric(4,1),
  range_estimate_km     numeric(5,0),

  is_full_tank          boolean not null default true,
  missed_previous       boolean not null default false,

  station               text,
  fuel_grade            text,
  notes                 text,
  created_at            timestamptz not null default now(),

  constraint odo_positive    check (odometer_km > 0),
  constraint litres_positive check (litres > 0),
  constraint cost_positive   check (total_cost >= 0)
);

create index fill_ups_vehicle_odo_idx on fill_ups (vehicle_id, odometer_km);
create unique index fill_ups_no_dupe_odo on fill_ups (vehicle_id, odometer_km);
create index fill_ups_vehicle_filled_at_idx on fill_ups (vehicle_id, filled_at);
