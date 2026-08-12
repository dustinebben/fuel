-- Consumption is only measurable between two *complete* fill-ups. This view is the
-- single source of truth for that rule — see CLAUDE.md "The correctness rule that
-- matters most". React reads these results; it never recomputes them.

create or replace view fill_ups_enriched
with (security_invoker = on) as
with ordered as (
  select f.*,
    lag(f.odometer_km)       over w as prev_odometer_km,
    lag(f.is_full_tank)      over w as prev_is_full,
    lag(f.range_estimate_km) over w as prev_range_estimate,
    lag(f.filled_at)         over w as prev_filled_at
  from fill_ups f
  window w as (partition by f.vehicle_id order by f.odometer_km)
)
select o.*,
  (o.odometer_km - o.prev_odometer_km) as distance_km,
  (o.total_cost / nullif(o.litres, 0)) as price_per_litre,

  case
    when o.prev_odometer_km is null                     then null
    when o.missed_previous                              then null
    when not o.is_full_tank                              then null
    when not coalesce(o.prev_is_full, false)             then null
    when (o.odometer_km - o.prev_odometer_km) <= 0        then null
    else round(o.litres * 100.0 / (o.odometer_km - o.prev_odometer_km), 2)
  end as actual_l_per_100km,

  case
    when o.prev_odometer_km is null or o.missed_previous then null
    when (o.odometer_km - o.prev_odometer_km) <= 0        then null
    else round(o.total_cost / (o.odometer_km - o.prev_odometer_km), 4)
  end as cost_per_km,

  case
    when o.prev_range_estimate is null or o.prev_odometer_km is null then null
    else round((o.odometer_km - o.prev_odometer_km) - o.prev_range_estimate, 0)
  end as range_estimate_error_km,

  extract(day from (o.filled_at - o.prev_filled_at)) as days_since_prev
from ordered o;
