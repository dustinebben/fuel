import { test, expect, type Page } from '@playwright/test'

// No live Supabase project is available for CI, so this smoke test mocks the
// Auth and REST endpoints at the network boundary and exercises the real
// app code end to end: sign in, add a fill-up, see it land in History.

const FAKE_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'driver@example.com',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}

const VEHICLE = {
  id: '22222222-2222-2222-2222-222222222222',
  user_id: FAKE_USER.id,
  name: 'Polo Vivo',
  make: null,
  model: null,
  year: null,
  tank_capacity_l: 45,
  fuel_type: '95',
  price_zone: 'inland',
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
}

async function mockBackend(page: Page) {
  const fillUps: Record<string, unknown>[] = []

  await page.route('**/auth/v1/otp', (route) => route.fulfill({ status: 200, json: {} }))

  await page.route('**/auth/v1/verify', (route) =>
    route.fulfill({
      status: 200,
      json: {
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: FAKE_USER,
      },
    }),
  )

  await page.route('**/rest/v1/vehicles*', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: [VEHICLE] })
    }
    return route.continue()
  })

  await page.route('**/rest/v1/fuel_prices*', (route) => route.fulfill({ status: 200, json: [] }))

  // Registered before fill_ups_enriched: Playwright matches the *last*-registered
  // route first, and "fill_ups*" would otherwise also match "fill_ups_enriched" URLs.
  await page.route('**/rest/v1/fill_ups*', (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const payload = route.request().postDataJSON()
    // First fill for the vehicle: every derived field is null per the
    // correctness rule in CLAUDE.md — this mock mirrors that, not the SQL view.
    fillUps.push({
      ...payload,
      id: `fill-${fillUps.length + 1}`,
      user_id: FAKE_USER.id,
      prev_odometer_km: null,
      prev_is_full: null,
      prev_range_estimate: null,
      prev_filled_at: null,
      distance_km: null,
      price_per_litre: payload.litres ? payload.total_cost / payload.litres : null,
      actual_l_per_100km: null,
      cost_per_km: null,
      range_estimate_error_km: null,
      days_since_prev: null,
    })
    return route.fulfill({ status: 201, json: {} })
  })

  await page.route('**/rest/v1/fill_ups_enriched*', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: fillUps })
    }
    return route.continue()
  })
}

test('sign in and log a fill-up', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/')

  await page.getByPlaceholder('you@example.com').fill('driver@example.com')
  await page.getByRole('button', { name: 'Send code' }).click()

  await page.getByPlaceholder('123456').fill('123456')
  await page.getByRole('button', { name: 'Verify' }).click()

  await expect(page.getByText('Log your first fill-up to bring this to life.')).toBeVisible()

  await page.getByRole('button', { name: 'Add fill-up' }).click()
  await expect(page.getByText('Add fill-up')).toBeVisible()

  await page.getByLabel('Odometer').fill('10500')
  await page.getByLabel('Litres').fill('40')
  await page.getByLabel('Total cost').fill('800')

  await expect(page.getByText('Saving R800,00')).toBeVisible()

  await page.getByRole('button', { name: 'Save fill-up' }).click()
  await expect(page.getByText('Add fill-up')).not.toBeVisible()

  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByText('First fill logged for this vehicle')).toBeVisible()
  await expect(page.getByText('R800,00')).toBeVisible()
})
