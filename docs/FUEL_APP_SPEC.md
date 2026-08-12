# Fuel — Complete Build Spec

A personal fuel-tracking PWA for South Africa, installable to the iPhone home screen. Log every fill-up; get insights into consumption, cost, and how much your car's own computer is lying to you.

**Built with:** Claude Code · React + Vite · Supabase · Cloudflare Pages
**Locale:** South Africa — ZAR, litres, kilometres, 93/95 ULP + diesel
**Theme:** dark only
**Cost:** R0/month

This document is the single source of truth. Give Claude Code one phase at a time (§12) — never the whole document as one prompt.

---

## 1. What this app is for

You fill up roughly every two weeks. Each time, five numbers are available to you at the pump and on the dash. Captured consistently, those five numbers unlock a surprising amount:

| Captured | Unlocks |
|---|---|
| Odometer (total km) | Distance per tank, all per-km maths |
| Litres put in | Real consumption, inferred tank size |
| Amount spent | Cost per km, monthly and annual spend |
| Trip-computer L/100km | **How much your dash over-states efficiency** |
| Range estimate (DTE) | **How much your range promise over-states reality** |

The last two are the differentiators. Every fuel app computes L/100km. Almost none tell you that your car claims 7.4 when the truth is 7.79 — a 5% flattery that quietly costs you a few hundred rand a year in bad planning.

**Success criteria.** Logging a fill-up takes under 20 seconds one-handed at a pump. The home screen tells you something true within two seconds of opening. Nothing is ever computed from data that can't support it.

---

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite 6 + React 19 + TypeScript (strict) | Static SPA. No SSR — nothing to server-render for one user |
| Styling | Tailwind CSS v4 | Glass tokens live in the `@theme` block |
| Animation | `motion/react` (Motion, formerly Framer Motion) | Spring physics. Half the Liquid Glass effect is motion |
| Charts | Recharts | Stripped to the bone — see §9 |
| Data | TanStack Query v5 + `@supabase/supabase-js` v2 | Caching, optimistic writes, retry |
| Forms | React Hook Form + Zod | Zod schema shared with the DB constraints |
| Backend | Supabase (Postgres 15 + Auth) | Free tier |
| PWA | `vite-plugin-pwa` | Manifest + Workbox service worker |
| Offline | Dexie (IndexedDB) | Write queue — see §11 |
| Hosting | Cloudflare Pages | Free tier |
| Tests | Vitest + Testing Library + Playwright | Metrics logic is unit-tested, not eyeballed |

### Repo layout

```
fuel/
├─ CLAUDE.md                    ← working agreement, keep updated
├─ src/
│  ├─ app/            routes, providers, error boundary
│  ├─ features/
│  │  ├─ fillups/     form, list, detail, mutations
│  │  ├─ insights/    one file per card, all pure functions
│  │  └─ auth/        OTP flow
│  ├─ components/
│  │  ├─ glass/       GlassCard, GlassSheet, GlassChip, GlassTabBar, FAB
│  │  └─ ui/          Button, NumericField, Toggle, Toast
│  ├─ lib/
│  │  ├─ supabase.ts  client + generated types
│  │  ├─ metrics.ts   ALL derived maths — pure, exhaustively tested
│  │  ├─ format.ts    ZAR / litres / km formatting, one place
│  │  └─ fuelPrice.ts SA regulated price calendar
│  └─ styles/glass.css
├─ supabase/migrations/         numbered SQL, never dashboard clicks
└─ tests/
```

**Non-negotiables for Claude Code:**

- `src/lib/metrics.ts` contains every derived calculation as a pure function. No maths in components, ever. It is the most-tested file in the repo.
- `src/lib/format.ts` is the only place a currency symbol or unit string appears.
- All SQL lives in numbered migration files. The database must be rebuildable from zero with `supabase db reset`.
- Types are generated (`supabase gen types typescript`) and committed. Never hand-write a row type.

---

## 3. Hosting

**Cloudflare Pages.** R0/month, unlimited bandwidth, 500 builds/month, automatic HTTPS, global edge. Chosen over Vercel because Vercel's Hobby tier caps bandwidth at 100 GB and *pauses your site* when you exceed it, and its terms restrict Hobby to non-commercial use. Cloudflare has neither constraint.

**Setup:** push to GitHub → Cloudflare dashboard → Workers & Pages → Connect to Git → build command `npm run build`, output directory `dist`, Node 20. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables for both production and preview. Every push to `main` deploys; every PR gets a preview URL.

Use the free `fuel.pages.dev` subdomain, or point a domain at it (~R200/year) — Cloudflare handles the certificate either way.

### The Supabase free-tier trap

**Free Supabase projects pause after 7 days without database activity.** At a fortnightly fill-up cadence, your backend will regularly be asleep when you reach for it, costing ~30 seconds to wake. Fix it with a keepalive.

```yaml
# .github/workflows/keepalive.yml
name: Supabase keepalive
on:
  schedule:
    - cron: '0 4 * * 1,4'      # Mon + Thu 06:00 SAST
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sf "${{ secrets.SUPABASE_URL }}/rest/v1/keepalive?select=id&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" || exit 1
```

Create a `keepalive` table holding one row, with a permissive read-only RLS policy, for this to hit. GitHub disables scheduled workflows in repos untouched for 60 days — a manual run or any commit resets the clock.

Free-tier headroom you will never approach: 500 MB database (a fill-up row is ~200 bytes, so 10 000 fills ≈ 2 MB), 1 GB storage, 5 GB bandwidth, 2 projects.

---

## 4. Auth

Supabase Auth, **email OTP (6-digit code)**, locked to your address alone.

### Why a code, not a magic link

A magic link opens in Safari. Your installed PWA is a separate storage context, so the session lands somewhere you can't use it — the app still shows the sign-in screen and you have no idea why. A 6-digit code is typed into the PWA itself, so the session lands exactly where it belongs. It happens once, possibly forever.

```ts
// send
await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: false },
})
// verify
await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
```

Configure the Magic Link email template in the Supabase dashboard to surface `{{ .Token }}` prominently — the default template leads with the link.

### Dashboard configuration — do all of these

1. **Auth → Providers:** enable Email. Disable every other provider.
2. **Auth → URL Configuration:** Site URL = your Pages URL. Redirect URLs include `https://<app>.pages.dev/**` and `http://localhost:5173/**`.
3. **Auth → Sign In / Up:** create your own account first, then **turn off "Allow new users to sign up."** This is the actual lock. Without it, anyone who finds the URL can register and get their own (empty, RLS-isolated) account — harmless to your data but it burns your auth quota and is untidy.
4. **Sessions:** JWT expiry 3600s, refresh token rotation enabled. Client uses `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`.
5. Supabase's shared SMTP is rate-limited but ample for one user. If it ever bounces, plug Resend's free tier in as custom SMTP.

Data isolation is **Row Level Security**, not client-side filtering (§5). The anon key is public by design and safe to ship — the service-role key must never touch the client bundle. Add a CI check that greps the build output for it.

---

## 5. Data model

### Tables

```sql
create table vehicles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  make            text,
  model           text,
  year            int,
  tank_capacity_l numeric(5,2),
  fuel_type       text not null default '95',   -- '93' | '95' | 'diesel-50' | 'diesel-500'
  price_zone      text not null default 'inland', -- 'inland' | 'coastal'
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);

create table fill_ups (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
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
```

### The two flags that matter more than they look

Consumption is only measurable **between two complete fills**: you measure the fuel needed to replace exactly what you burned over a known distance.

- `is_full_tank = false` → the litres figure doesn't correspond to the distance. That interval is unmeasurable.
- `missed_previous = true` → the odometer gap spans unknown litres. That interval is unmeasurable.

Get these wrong and every downstream number is quietly, plausibly wrong — which is worse than being obviously wrong. Surface both as one-tap toggle chips on the form (defaults: full = on, missed = off), never buried behind an accordion.

### RLS

```sql
alter table vehicles enable row level security;
alter table fill_ups enable row level security;

create policy "own vehicles" on vehicles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own fill_ups" on fill_ups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Set `user_id` with a `before insert` trigger defaulting to `auth.uid()` so the client can never assert someone else's id.

### Derived-metrics view

The maths lives in Postgres. React reads results, never computes them.

```sql
create or replace view fill_ups_enriched as
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
    when not o.is_full_tank                             then null
    when not coalesce(o.prev_is_full, false)            then null
    when (o.odometer_km - o.prev_odometer_km) <= 0      then null
    else round(o.litres * 100.0 / (o.odometer_km - o.prev_odometer_km), 2)
  end as actual_l_per_100km,

  case
    when o.prev_odometer_km is null or o.missed_previous then null
    when (o.odometer_km - o.prev_odometer_km) <= 0       then null
    else round(o.total_cost / (o.odometer_km - o.prev_odometer_km), 4)
  end as cost_per_km,

  case
    when o.prev_range_estimate is null or o.prev_odometer_km is null then null
    else round((o.odometer_km - o.prev_odometer_km) - o.prev_range_estimate, 0)
  end as range_estimate_error_km,

  extract(day from (o.filled_at - o.prev_filled_at)) as days_since_prev
from ordered o;
```

Trip-computer bias, computed per valid interval in `metrics.ts`:

```
bias_pct = (computer_l_per_100km − actual_l_per_100km) / actual_l_per_100km × 100
```

Negative means the dash flatters itself. Most cars under-report by 3–8%.

### Reference case — assert these in a test

Fill 1: odometer 118 000 km, full tank. Fill 2: odometer 118 620 km, 48.30 L, R1 260.63, dash showed 7.4 L/100km, previous fill's range estimate was 640 km.

| Metric | Value |
|---|---|
| distance_km | 620 |
| price_per_litre | R26.10 |
| actual_l_per_100km | 7.79 |
| cost_per_km | R0.2033 → **R203.33 / 100 km** |
| computer bias | **−5.0%** |
| range_estimate_error_km | **−20 km** |

Also assert the null paths: first-ever fill, `is_full_tank = false`, `missed_previous = true`, and a non-increasing odometer must **all** yield `null` for `actual_l_per_100km`.

> **Implementation note (2026-08-12):** the `cost_per_km` row above has a decimal typo —
> `R1260.63 / 620 km = R2.0333/km`, not `R0.2033/km`. `× 100 = R203.33` still checks out,
> and that's the number the app actually surfaces. `src/lib/metrics.test.ts` asserts the
> corrected value and documents the discrepancy inline.

---

## 6. South African fuel pricing

This locale changes the design meaningfully, and getting it right is what makes the app feel built rather than generic.

**Petrol (93 and 95 ULP) is price-regulated.** The Department of Mineral and Petroleum Resources sets the retail price, adjusted on the **first Wednesday of each month**, with separate inland (Gauteng) and coastal benchmarks. As at 1 July 2026: 95 ULP R26.10 inland / R25.23 coastal; 93 ULP R25.94 inland / R25.07 coastal.

Two consequences:

1. **Do not build a "cheapest station" feature for petrol.** Every station charges the same regulated price within a zone. A station-comparison card would be pure noise. Track station for context only.
2. **Diesel is not regulated at the pump** — DMPR publishes a wholesale reference (50 ppm: R25.17 inland / R24.30 coastal as at July 2026) and retailers discount from there. For a diesel vehicle, station comparison *is* meaningful. Show it conditionally on `vehicles.fuel_type`.

**The insight this unlocks.** Price changes are monthly, scheduled, and forecast publicly about a week ahead. So the app can say: *"Price rises 38c on Wed 2 Sep. Filling before it lands saves about R18."* That's genuinely actionable and no generic international fuel app can produce it.

Implementation in `src/lib/fuelPrice.ts`:

- Compute the next first-Wednesday from any date — pure function, unit-tested across month boundaries and years.
- Store the official price per grade/zone/effective-date in a small `fuel_prices` table you update monthly (one row, 30 seconds). Don't scrape — SA price sources have no stable free API and a scraper is exactly the kind of thing that breaks silently and makes you distrust the app.
- Derive "you paid X vs the official price of Y" — a persistent gap means you're logging litres or rands wrong, so it doubles as a data-quality check.

**Formatting.** Use `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`, which yields `R1 261,00` — space thousands separator, comma decimal. If you prefer `R1 261.00`, override the decimal separator in `format.ts` and nowhere else. Dates `DD/MM/YYYY`. Distance always km, volume always litres, internally and on screen.

> **Implementation note (2026-08-12):** `Intl.NumberFormat('en-ZA', ...)` turned out to be
> unreliable in practice — its en-ZA CLDR data disagrees on the decimal separator across
> ICU versions (Node emitted `R 800.00`, not the `R1 261,00` shown above). `format.ts`
> hand-rolls the grouping/decimal logic instead so the output is identical everywhere:
> dev, tests, and the shipped iOS build.

---

## 7. Insights

Every card must degrade gracefully with 0, 1 or 2 fill-ups logged — a calm "one more fill-up and this comes alive" state, never `NaN`, never `—` with no explanation. Every card that consumes `actual_l_per_100km` filters `is not null` first.

### Hero
1. **Last tank** — actual L/100km at 56px, with delta against the rolling 5-fill average and direction arrow.
2. **Cost per 100 km** — in rand. More intuitive than cost per km, and it's what maps to your wallet.

### Efficiency
3. **Rolling averages** — 5-fill and lifetime, side by side.
4. **Trend chart** — L/100km per fill over time with a rolling-average overlay, best/worst band shaded.
5. **Best and worst tank** — dates, plus the annualised rand difference between them.
6. **Seasonal split** — average L/100km by month once 12+ months exist. Highveld winter and aircon season both show up here.

### Money
7. **Spend this month / this year** — with a monthly sparkline.
8. **Price paid per litre** — latest vs 12-month average; where it sits as a percentile of everything you've paid.
9. **Projected annual cost** — `lifetime cost / lifetime days × 365`, with projected annual distance beside it.
10. **The 10% card** — "improve 10% and you save R X a year." Trivial to compute, quietly motivating.
11. **Average cost per fill** and average days between fills.

### Car vs reality — the differentiated set
12. **Trip-computer bias** — "your dash reports 5.0% better than reality," with a small claimed-vs-actual chart.
13. **Range accuracy** — average `range_estimate_error_km`, plus the single worst under-delivery, because that's the one that strands you.
14. **Inferred usable tank** — largest fill ever vs spec capacity. Tells you how deep you actually run it.
15. **Distance per tank** — average and best.

### South Africa
16. **Next price change** — countdown to the first Wednesday, and the rand impact of filling before vs after (§6).
17. **Paid vs official price** — a standing discrepancy means a data-entry problem.

### Housekeeping
18. **Since last fill** — days elapsed, litres remaining estimate.
19. **CSV export** — client-side, one button. Build it in Phase 1, not "later". It's your escape hatch and it costs 20 lines.

---

## 8. Liquid Glass design system

The target is Apple's iOS 26 Liquid Glass: translucent layers that refract what's behind them, with specular highlights along the edges, material that responds to motion and light. The failure mode — the one every web attempt lands in — is **a grey box with a blur on it**.

Four things separate real glass from a grey box: **saturation**, **edge treatment**, **cast shadow**, and **motion**. Miss any one and it dies.

### Foundation — give the glass something to refract

Glass over a flat dark background is just a lighter flat rectangle. The background must have colour worth pulling through: slow-drifting radial gradient blobs.

```css
@theme {
  --color-bg:          oklch(0.15 0.02 265);
  --color-bg-elevated: oklch(0.19 0.03 265);

  --glass-tint:        oklch(1 0 0 / 0.075);
  --glass-tint-strong: oklch(1 0 0 / 0.12);
  --glass-blur:        22px;
  --glass-saturate:    180%;

  --color-accent: oklch(0.70 0.18 285);
  --color-good:   oklch(0.82 0.16 165);
  --color-warn:   oklch(0.82 0.16 80);
  --color-bad:    oklch(0.68 0.20 25);

  --radius-card:  26px;
  --radius-tile:  22px;
  --radius-sheet: 38px;

  --ease-glass:    cubic-bezier(0.32, 0.72, 0, 1);
  --spring-press:  { type: 'spring', stiffness: 400, damping: 30 };
  --spring-enter:  { type: 'spring', stiffness: 260, damping: 26 };
  --spring-sheet:  { type: 'spring', stiffness: 300, damping: 34 };
}

body::before {
  content: '';
  position: fixed; inset: -25%;
  background:
    radial-gradient(22rem 22rem at 18% 10%, oklch(0.55 0.22 275 / 0.62), transparent 62%),
    radial-gradient(20rem 20rem at 88% 72%, oklch(0.62 0.16 195 / 0.50), transparent 62%),
    radial-gradient(18rem 18rem at 55% 44%, oklch(0.58 0.21 330 / 0.38), transparent 65%);
  filter: blur(34px);
  animation: drift 26s var(--ease-glass) infinite alternate;
  z-index: -1;
}
@keyframes drift {
  to { transform: translate3d(-5%, 4%, 0) scale(1.14) rotate(7deg); }
}
```

### The glass surface

```css
.glass {
  position: relative;
  background: var(--glass-tint);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-radius: var(--radius-card);
  border: 1px solid transparent;
  box-shadow:
    0 1px 0 0 oklch(1 0 0 / 0.16) inset,     /* top specular edge */
    0 -1px 0 0 oklch(0 0 0 / 0.22) inset,    /* bottom shadow edge */
    0 12px 34px -10px oklch(0 0 0 / 0.50),   /* cast shadow — this is the depth */
    0 2px 8px -2px oklch(0 0 0 / 0.30);
}

/* Gradient stroke. Single biggest contributor to "this is real glass". */
.glass::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(145deg,
    oklch(1 0 0 / 0.45) 0%,
    oklch(1 0 0 / 0.08) 32%,
    oklch(1 0 0 / 0.02) 58%,
    oklch(1 0 0 / 0.22) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}
```

### Rules

- **`saturate(180%)` is mandatory.** Blur alone reads as fog. The saturation boost is what makes the eye read *glass pulling colour through* rather than *frosted plastic*.
- **Two layers maximum.** A glass card on the background, and at most one lighter glass chip inside it. Three stacked `backdrop-filter`s look muddy and destroy scroll performance on iPhone.
- **Never omit the cast shadow.** Glass with no shadow looks painted on the background. `0 12px 34px -10px` is the workhorse.
- **Light comes from the top-left, always.** Every gradient stroke uses 145deg. Consistency is what makes the surfaces feel like one material rather than a set of unrelated cards.
- **Tabular numerals everywhere numbers appear.** `font-variant-numeric: tabular-nums`. Without it, count-up animations jitter horribly as digit widths change.
- **Typography does heavy lifting.** `-apple-system, 'SF Pro Display', system-ui`. Hero numbers 56px, weight 500–600, `letter-spacing: -0.04em`. Section labels 11px, weight 500, `letter-spacing: 0.08em`, uppercase, 50% white. Body 14px at 55–70% white. Pure `#fff` is reserved for primary values only — that restraint is most of the hierarchy.
- **Colour means something.** Accent violet for neutral emphasis, green for better-than-average, amber for attention, red only for genuine problems. A card is not coloured because it would look nice coloured.

### Motion — this is where "slick" is won or lost

Static glass is a screenshot. The material has to behave.

| Interaction | Behaviour |
|---|---|
| Card press | `scale(0.97)` on `pointerdown`, spring back on release. Stiffness 400, damping 30 |
| Screen entry | Cards rise 12px + fade in, staggered 40ms. Never all at once |
| Number change | Count up over 550ms, `ease-out`, tabular-nums. The hero number counting up after a save is the app's signature moment |
| Sheet present | Rises from bottom on a spring (stiffness 300, damping 34), background scales to 0.94 and dims — the iOS card-stack idiom |
| Sheet dismiss | Drag-to-dismiss with rubber-band resistance past 40%, velocity-aware snap |
| Scroll | Header glass intensifies from `blur(0)` to `blur(26px)` over the first 60px of scroll. Use `useScroll` + `useTransform`, never a scroll listener with `setState` |
| Tab switch | Active pill slides between tabs with `layoutId` (shared-element transition) |
| Delete | Row collapses height to 0 while fading, then an undo toast slides up |

**Tilt-reactive specular highlight.** iOS's Liquid Glass shifts its highlight as you tilt the device. This is reproducible on the web with `DeviceOrientationEvent` — map `gamma`/`beta` to the gradient angle of the `::before` stroke and to a subtle background-position shift on the hero card. iOS 13+ requires calling `DeviceOrientationEvent.requestPermission()` from a user gesture, so gate it behind a one-time "enable motion effects" toggle in settings. **Progressive enhancement — the app must be complete without it.** Clamp the effect hard (±8° of visual change) or it reads as broken rather than premium.

### Performance

`backdrop-filter` is genuinely expensive on iPhone, and this is a scrolling list of glass cards — the worst case.

- `will-change: transform` on animated cards; remove it when animation completes.
- Never animate `backdrop-filter` itself. Animate `opacity` on a layer that already has it.
- Never animate `box-shadow`. Cross-fade two stacked pseudo-elements instead.
- The background blob animation runs 26s and transforms only — cheap, GPU-composited.
- Virtualise the history list past ~50 rows.
- **Profile on the actual phone.** Simulator performance is a lie. Target 60fps on the scroll.

### Accessibility

- `prefers-reduced-transparency` → swap glass for solid `--color-bg-elevated` with a hairline border. Layout must not shift.
- `prefers-reduced-motion` → kill blob drift, count-ups and stagger. Keep the sheet, but as a fade.
- Verify 4.5:1 contrast against the **lightest** point the glass can sit over, not the average. The blob is bright in the top-left; that's the test case.
- Every icon-only control (the FAB, settings) needs an `aria-label`.
- Minimum 44×44px touch targets. You'll be using this in the dark, possibly in the rain.

---

## 9. Screens

### Home
Vertical scroll of glass cards on the drifting gradient. Order: hero L/100km → cost tiles → trend chart → car-vs-reality cards → SA price-change card. Glass FAB bottom-right, accent-tinted. Glass tab bar pinned bottom with safe-area padding.

Header shows vehicle name and current odometer, and its glass intensifies as you scroll.

### Add fill-up
The screen that determines whether you keep using this app. It is used one-handed, at a pump, sometimes at night, sometimes in the rain, always slightly impatient.

- Presents as a sheet: `--radius-sheet` on the top corners only, spring in, drag to dismiss.
- **Odometer pre-filled** with last odometer + average distance per tank. You correct a number; you never type five digits from scratch.
- All numeric fields: `inputMode="decimal"` with `type="text"`. `type="number"` on iOS brings the wrong keyboard and lets an accidental scroll change the value.
- **Enter any two of** litres / total cost / price-per-litre — the third derives live and shows as a dimmed computed value.
- Station remembered from last time, offered as a chip alongside your three most-used.
- The two flags as toggle chips, visible without scrolling.
- Live validation, non-blocking: odometer must exceed previous (hard block, with a clear message); litres beyond tank capacity × 1.05 warns; implied L/100km outside 2–30 warns. Warnings inform, they don't prevent saving — sometimes reality is weird.
- On save: sheet dismisses, home hero **counts up to the new number**. That moment is the reward loop; get it right.
- Haptics: iOS Safari does **not** support `navigator.vibrate`. There's a known hack using a hidden `<input type="checkbox" switch>` on iOS 17.4+. Treat it as strictly optional garnish — do not build any feedback that depends on it.

### History
Reverse-chronological list of slim glass chips: date, L/100km, total cost, price/litre. Tap to expand to full detail with all derived numbers. Swipe left to delete, with an undo toast. Intervals that couldn't be measured show a subtle marker explaining why, rather than a blank.

### Insights
The deeper cuts and full-size charts from §7 that don't fit on home. Month/year/all-time segmented control.

### Settings
Vehicle details, tank capacity, fuel grade, price zone (inland/coastal), motion-effects toggle, CSV export, sign out.

### Chart styling
Strip Recharts to nothing. No axis lines. No vertical grid. Horizontal grid at 6% white, two lines maximum. Area fill is a gradient from `accent / 0.35` to transparent. Line 2.5px, `strokeLinecap: round`. The latest point gets a filled dot with a background-coloured core. Tooltips are glass chips, never white boxes. Axis labels 11px at 35% white.

---

## 10. PWA and iOS

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icon-180.png">
```

- `black-translucent` runs content under the status bar — this is what sells the native feel. You **must** then pad with `env(safe-area-inset-top)` or the header sits under the clock.
- Tab bar needs `padding-bottom: env(safe-area-inset-bottom)` for the home indicator.
- `overscroll-behavior-y: none` on `body` kills the iOS rubber-band on the page (keep it inside scrollable lists).
- `-webkit-tap-highlight-color: transparent`, and `user-select: none` on chrome elements — a long-press selecting your header text instantly breaks the illusion.
- Manifest: `display: "standalone"`, `theme_color` and `background_color` both `#131318`, `orientation: "portrait"`, icons at 192/512 plus a maskable 512.
- **No back button exists in a standalone PWA.** Every screen needs its own back affordance or reachable tab.
- Service worker: precache the shell, network-first for Supabase calls. Show a non-intrusive "update available" chip rather than reloading under the user.

---

## 11. Offline

Petrol stations have poor reception, and this is the one moment the app is used. Offline write support is not a nice-to-have here.

- Save writes to IndexedDB (Dexie) first, then sync to Supabase. The UI reads local state, so a save always feels instant.
- Queue failed writes; retry on `online` and on app focus.
- Show a small glass "1 pending" chip in the header when the queue is non-empty. Never a blocking modal.
- Conflict resolution is trivially last-write-wins — single user, single device.
- TanStack Query optimistic updates for the in-session experience; Dexie for durability across a cold start.

---

## 12. Build phases

Give Claude Code **one phase per session**. Verify each on the actual phone before moving on. Commit at every phase boundary.

### Phase 1 — Skeleton and data
Scaffold Vite + React + TS + Tailwind v4. Create the Supabase project, write migrations for both tables, RLS policies and the enriched view. Implement the OTP auth flow. Build the add-fill-up form and a plain history list with no styling beyond legibility. Implement `metrics.ts` with full unit tests including the §5 reference case and all four null paths.

*Done when:* you can log a fill-up from your phone's browser and it persists, and `npm test` passes.

### Phase 2 — The glass
Implement §8 in full: tokens, `GlassCard`, `GlassSheet`, `GlassChip`, `GlassTabBar`, `FAB`, and the background. Restyle both existing screens. Add the motion table from §8. Deploy to Cloudflare Pages, wire the PWA manifest, install to the home screen, and fix the safe-area and standalone-mode problems that will absolutely appear.

*Done when:* it's on your home screen, opens without browser chrome, and holds 60fps while scrolling.

### Phase 3 — Insights
All cards from §7 as pure functions in `metrics.ts` with dumb presentational components. Trend and price charts styled per §9. Empty and single-fill states for every card. The SA price calendar and `fuel_prices` table.

*Done when:* the app tells you something about your car you didn't already know.

### Phase 4 — Polish
Offline queue (§11). Optimistic updates. Count-up animations, staggered entrances, drag-to-dismiss, scroll-linked header. CSV export. The keepalive workflow. Tilt-reactive highlight behind a settings toggle. Playwright smoke test of the log-a-fill-up path.

### Phase 5 — If you want it later
Multi-vehicle. Receipt photo into Supabase Storage with OCR prefill. Service and tyre logging against the same odometer series. Diesel station price comparison. Note that home-screen widgets are impossible from a PWA — that requires a native shell.

---

## 13. Verification checklist

Before calling it done:

- [ ] `supabase db reset` rebuilds everything from migrations
- [ ] Reference case in §5 asserted in tests, plus all four null paths
- [ ] `fuelPrice.ts` first-Wednesday logic tested across month and year boundaries
- [ ] Every insight card renders correctly with 0, 1 and 2 fill-ups
- [ ] Signed out in a private window: no data readable via the anon key
- [ ] Service-role key absent from `dist/` — automated grep in CI
- [ ] Sign-up disabled in the Supabase dashboard
- [ ] 60fps scroll on the physical iPhone with 30+ fill-ups
- [ ] `prefers-reduced-motion` and `prefers-reduced-transparency` both honoured
- [ ] Contrast checked over the brightest part of the background gradient
- [ ] Airplane mode: a fill-up saves, then syncs when reconnected
- [ ] CSV export opens correctly in Excel with ZAR values intact
- [ ] Keepalive workflow has run at least once successfully
