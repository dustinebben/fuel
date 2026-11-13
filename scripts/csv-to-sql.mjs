#!/usr/bin/env node
// Turns the app's "Export CSV" file into SQL that loads the history into Neon under a
// given user. Zero dependencies; it only prints SQL, it never connects anywhere.
//
//   node scripts/csv-to-sql.mjs export.csv --email you@example.com --vehicle "Polo Vivo" \
//        [--fuel 95] [--zone inland] [--tank 45] > import.sql
//   psql "$DATABASE_URL" -f import.sql        # or paste into the Neon SQL editor
//
// Runs in one transaction and fails loudly if the user doesn't exist yet. Only the
// columns present in the export are carried over (date, odometer, litres, cost, dash
// L/100km, full-tank, missed-previous, station, notes). Derived columns (price/litre,
// distance, actual L/100km, cost/km) are NOT imported: the fill_ups_enriched view
// recomputes them, so a bad number in the CSV can never leak in. The export has only a
// date, so the time of day is set to 12:00 SAST (10:00 UTC) — that keeps same-day
// fill-ups in odometer order.

import { readFileSync } from 'node:fs'

const [file, ...rest] = process.argv.slice(2)
const opt = {}
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = rest[i + 1]
if (!file || !opt.email || !opt.vehicle) {
  console.error('usage: csv-to-sql.mjs <export.csv> --email <user email> --vehicle <name> [--fuel 95] [--zone inland] [--tank 45]')
  process.exit(1)
}
const fuel = opt.fuel ?? '95'
const zone = opt.zone ?? 'inland'
if (!['93', '95', 'diesel-50', 'diesel-500'].includes(fuel)) throw new Error(`bad --fuel ${fuel}`)
if (!['inland', 'coastal'].includes(zone)) throw new Error(`bad --zone ${zone}`)
const tank = opt.tank === undefined ? null : Number(opt.tank)
if (tank !== null && !(tank > 0)) throw new Error(`bad --tank ${opt.tank}`)

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((v) => v !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((v) => v !== '')) rows.push(row)
  return rows
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
function parseDate(s) {
  s = s.trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z.]*\s+(\d{4})$/.exec(s)
  if (m) {
    const mi = MONTHS.indexOf(m[2].toLowerCase())
    if (mi >= 0) return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  throw new Error(`Unrecognised date "${s}"`)
}

const num = (s, name, line) => {
  const v = Number(String(s).trim().replace(',', '.'))
  if (!Number.isFinite(v)) throw new Error(`line ${line}: bad ${name} "${s}"`)
  return v
}
const lit = (s) => (s === '' ? 'null::text' : `'${s.replace(/'/g, "''")}'`)

const [header, ...data] = parseCsv(readFileSync(file, 'utf8'))
const col = (name) => {
  const i = header.indexOf(name)
  if (i < 0) throw new Error(`CSV is missing the "${name}" column`)
  return i
}
const c = {
  date: col('Date'), odo: col('Odometer (km)'), litres: col('Litres'), cost: col('Total cost (R)'),
  dash: col('Dash L/100km'), full: col('Full tank'), missed: col('Missed previous'),
  station: col('Station'), notes: col('Notes'),
}

const values = data.map((r, idx) => {
  const line = idx + 2
  const dash = r[c.dash].trim()
  return `    ('${parseDate(r[c.date])} 10:00:00+00'::timestamptz, ${num(r[c.odo], 'odometer', line)}, ${num(r[c.litres], 'litres', line)}, ${num(r[c.cost], 'cost', line)}, ${dash === '' ? 'null::numeric' : num(dash, 'dash L/100km', line)}, ${r[c.full].trim() === 'yes'}, ${r[c.missed].trim() === 'yes'}, ${lit(r[c.station])}, ${lit(r[c.notes])})`
})

console.log(`-- ${data.length} fill-ups from ${file}
begin;

do $$ begin
  if not exists (select 1 from neon_auth."user" where lower(email) = lower(${lit(opt.email)})) then
    raise exception 'No Neon Auth user with email %. Create the account first.', ${lit(opt.email)};
  end if;
end $$;

with u as (select id from neon_auth."user" where lower(email) = lower(${lit(opt.email)})),
v as (
  insert into vehicles (user_id, name, fuel_type, price_zone, tank_capacity_l, is_default)
  select u.id, ${lit(opt.vehicle)}, '${fuel}', '${zone}', ${tank ?? 'null'}, true from u
  returning id, user_id
)
insert into fill_ups (vehicle_id, user_id, filled_at, odometer_km, litres, total_cost, computer_l_per_100km, is_full_tank, missed_previous, station, notes)
select v.id, v.user_id, t.* from (values
${values.join(',\n')}
) as t(filled_at, odometer_km, litres, total_cost, computer_l_per_100km, is_full_tank, missed_previous, station, notes)
cross join v;

commit;`)
