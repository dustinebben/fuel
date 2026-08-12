-- Row Level Security is the only access control. Client-side filtering is never trusted.

alter table vehicles enable row level security;
alter table fill_ups enable row level security;

create policy "own vehicles" on vehicles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own fill_ups" on fill_ups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_id is stamped server-side so the client can never assert someone else's id.
create or replace function set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger vehicles_set_user_id
  before insert on vehicles
  for each row execute function set_user_id();

create trigger fill_ups_set_user_id
  before insert on fill_ups
  for each row execute function set_user_id();
