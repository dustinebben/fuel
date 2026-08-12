-- One row, hit by .github/workflows/keepalive.yml, so the free-tier Supabase project
-- doesn't pause after 7 days without database activity.

create table keepalive (
  id         int primary key default 1,
  pinged_at  timestamptz not null default now(),
  constraint keepalive_single_row check (id = 1)
);

insert into keepalive (id) values (1);

alter table keepalive enable row level security;

create policy "anyone can read keepalive" on keepalive
  for select using (true);
