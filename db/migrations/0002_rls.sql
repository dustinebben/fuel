-- Row Level Security is the only access control. Client-side filtering is never trusted.
-- The Neon Data API runs each request as the `authenticated` role with the verified JWT
-- in scope; auth.uid() returns the JWT `sub` as a uuid (null when unauthenticated).

alter table vehicles enable row level security;
alter table fill_ups enable row level security;

create policy "own vehicles" on vehicles
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own fill_ups" on fill_ups
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_id is stamped server-side so the client can never assert someone else's id.
-- Outside a JWT context (data imports run as the table owner) auth.uid() is null and the
-- supplied user_id is kept; RLS still rejects any client write whose user_id isn't theirs.
create or replace function set_user_id()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(auth.uid(), new.user_id);
  return new;
end;
$$;

create trigger vehicles_set_user_id
  before insert on vehicles
  for each row execute function set_user_id();

create trigger fill_ups_set_user_id
  before insert on fill_ups
  for each row execute function set_user_id();

-- The Data API grants nothing by default: the authenticated role gets exactly what it needs.
grant usage on schema public to authenticated;
grant select, insert, update, delete on vehicles, fill_ups to authenticated;
