# CLAUDE.md — Fuel

Drop this at the repo root. Claude Code reads it automatically at the start of every session.

Full specification lives in `docs/FUEL_APP_SPEC.md`. Read it before starting a phase. This file is the short working agreement.

---

## What this is

A personal fuel-tracking PWA, installed to an iPhone home screen. Single user. South Africa: ZAR, litres, kilometres, 93/95 ULP and diesel. Dark theme only.

Stack: Vite + React 19 + TypeScript (strict) · Tailwind v4 · Motion · Recharts · Neon (Postgres + Data API + Managed Better Auth) · Vercel.

---

## Architecture rules

**All derived maths lives in `src/lib/metrics.ts` as pure functions.** No calculation in a component, ever. This file is the most-tested in the repo — every function has tests including null and boundary paths.

**All formatting lives in `src/lib/format.ts`.** A currency symbol, unit string or date format appearing anywhere else is a bug.

**All SQL lives in `db/migrations/` as numbered files.** Never make schema changes through the console. Applying the files in order to an empty Neon database (with Neon Auth provisioned) must rebuild everything from zero.

**Database types are generated, never hand-written** (apart from the two literal-union narrowings noted in the file header). Regenerate from the Neon Data API (https://neon.com/docs/data-api/generate-types) and commit `src/lib/database.types.ts`.

**Money is `numeric` in Postgres and a string-formatted value at the edge.** Never `float` for currency.

**Internal units are always km and litres.** Any display conversion is a view-layer concern.

---

## The correctness rule that matters most

Consumption is measured **full tank to full tank**. A *span* runs from the previous full tank (exclusive) to this full tank (inclusive) and may contain partial top-ups, whose litres all count. `actual_l_per_100km` and `cost_per_km` are `null` when any of these hold:

- this fill is not a full tank (a partial fill is counted in the next full tank's span)
- there is no earlier full tank for the vehicle
- `missed_previous = true` on any fill inside the span
- the odometer did not increase

The SQL view (`db/migrations/0005_full_to_full.sql`) is the source of truth; `enrichFillUps` in `metrics.ts` mirrors it exactly and both are tested. Anything that previews a figure (e.g. the add form) goes through `previewConsumption`, never its own maths. Per-fill `distance_km` is the gap since the previous fill of any kind; the distance of a *tank* is `span_distance_km`.

Never display a number derived from an invalid span. Never substitute 0. Filter `is not null` before any aggregate. A plausible-looking wrong number is worse than an obviously missing one.

**Writes:** only an unreachable network may be queued offline. A write the server answered with an error is shown to the person, never silently queued.

---

## Design rules

The look is Apple Liquid Glass. Four things make it work; missing any one makes it a grey box with a blur:

1. `backdrop-filter: blur(22px) saturate(180%)` — the saturation is not optional
2. A gradient border stroke at 145deg via a masked `::before`
3. A cast shadow (`0 12px 34px -10px`) — glass without one looks painted on
4. Motion — press springs, staggered entrances, count-up numbers

Also:

- Two glass layers maximum. Never nest three.
- Light comes from the top-left. Every gradient stroke is 145deg.
- `font-variant-numeric: tabular-nums` on every number.
- Pure white is for primary values only. Everything else is white at 35–70%.
- Never animate `backdrop-filter` or `box-shadow`. Animate `opacity` and `transform`.
- Honour `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Minimum 44×44px touch targets.

---

## iOS PWA constraints

- `viewport-fit=cover` plus `env(safe-area-inset-*)` padding, or content lands under the clock and home indicator.
- `type="number"` is banned on inputs — use `type="text" inputMode="decimal"`.
- `navigator.vibrate` does not work in iOS Safari. Do not build feedback that depends on haptics.
- A standalone PWA has no back button. Every screen needs its own back affordance.
- Test on the physical phone. The simulator lies about `backdrop-filter` performance.

---

## Commands

```bash
npm run dev              # vite dev server
npm test                 # vitest
npm run test:e2e         # playwright
npm run build             # production build
node scripts/csv-to-sql.mjs export.csv --email … --vehicle …   # CSV export -> SQL import
```

---

## Working style

- Work one phase at a time (spec §12). Don't run ahead into the next phase.
- Write the test for a metric before the metric.
- Commit at phase boundaries with a summary of what's verifiable.
- When the spec and an implementation detail conflict, raise it rather than silently deviating.
- Don't add dependencies not listed in the spec without asking. This app should stay small.

## Security

- `VITE_NEON_URL` is public and safe to ship. The Postgres connection string (`DATABASE_URL`) and any Neon API key must never appear in client code or the build output.
- Row Level Security is the only access control. Never rely on client-side filtering for isolation. The Data API grants nothing by default — every table/view needs an explicit `grant` to `authenticated` and RLS.
- Sign-ups are disabled in Neon Auth (Console → Auth, or `update_auth_email_and_password`). Don't add a sign-up UI.
