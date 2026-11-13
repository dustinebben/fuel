-- Consumption is measured full-tank to full-tank. A "span" runs from the previous FULL
-- tank (exclusive) to this full tank (inclusive) and may contain partial top-ups, whose
-- litres all count. A span is unusable (actual_l_per_100km and cost_per_km are null) when:
--   * this fill is not a full tank
--   * there is no earlier full tank for the vehicle
--   * any fill inside the span has missed_previous = true
--   * the odometer did not increase
-- This replaces the stricter "previous fill must also be full" rule from 0003 (partial
-- top-ups used to blank the next measurement). Mirrored by src/lib/metrics.ts.

drop view if exists fill_ups_enriched;

create view fill_ups_enriched
with (security_invoker = on) as
with ordered as (
  select f.*,
    lag(f.odometer_km)       over w as prev_odometer_km,
    lag(f.is_full_tank)      over w as prev_is_full,
    lag(f.range_estimate_km) over w as prev_range_estimate,
    lag(f.filled_at)         over w as prev_filled_at,
    -- odometer of the latest full tank strictly before this row
    max(f.odometer_km) filter (where f.is_full_tank)
      over (partition by f.vehicle_id order by f.odometer_km
            rows between unbounded preceding and 1 preceding) as prev_full_odometer_km,
    -- number of full tanks strictly before this row: constant across a span
    count(*) filter (where f.is_full_tank)
      over (partition by f.vehicle_id order by f.odometer_km
            rows between unbounded preceding and 1 preceding) as full_tanks_before
  from fill_ups f
  window w as (partition by f.vehicle_id order by f.odometer_km)
),
spans as (
  select o.*,
    sum(o.litres)          over s as grp_litres,
    sum(o.total_cost)      over s as grp_cost,
    count(*)               over s as grp_fills,
    bool_or(o.missed_previous) over s as grp_missed
  from ordered o
  window s as (partition by o.vehicle_id, o.full_tanks_before)
),
shaped as (
  select sp.*,
    (sp.is_full_tank and sp.prev_full_odometer_km is not null) as has_span
  from spans sp
)
select
  h.id, h.user_id, h.vehicle_id, h.filled_at, h.odometer_km, h.litres, h.total_cost,
  h.computer_l_per_100km, h.range_estimate_km, h.is_full_tank, h.missed_previous,
  h.station, h.fuel_grade, h.notes, h.created_at,
  h.prev_odometer_km, h.prev_is_full, h.prev_range_estimate, h.prev_filled_at,
  (h.odometer_km - h.prev_odometer_km) as distance_km,
  (h.total_cost / nullif(h.litres, 0)) as price_per_litre,

  case
    when not h.has_span                                      then null
    when h.grp_missed                                        then null
    when (h.odometer_km - h.prev_full_odometer_km) <= 0      then null
    else round(h.grp_litres * 100.0 / (h.odometer_km - h.prev_full_odometer_km), 2)
  end as actual_l_per_100km,

  case
    when not h.has_span                                      then null
    when h.grp_missed                                        then null
    when (h.odometer_km - h.prev_full_odometer_km) <= 0      then null
    else round(h.grp_cost / (h.odometer_km - h.prev_full_odometer_km), 4)
  end as cost_per_km,

  case
    when h.prev_range_estimate is null or h.prev_odometer_km is null then null
    else round((h.odometer_km - h.prev_odometer_km) - h.prev_range_estimate, 0)
  end as range_estimate_error_km,

  extract(day from (h.filled_at - h.prev_filled_at)) as days_since_prev,

  case when h.has_span then (h.odometer_km - h.prev_full_odometer_km) end as span_distance_km,
  case when h.has_span then h.grp_litres end as span_litres,
  case when h.has_span then h.grp_cost   end as span_cost,
  case when h.has_span then h.grp_fills  end as span_fills,
  case when h.has_span then h.grp_missed end as span_missed
from shaped h;

grant select on fill_ups_enriched to authenticated;
