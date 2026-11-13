import { test, expect, type Page, type Route } from '@playwright/test'
import { enrichFillUps } from '../../src/lib/metrics'
import type { FillUpRow } from '../../src/lib/database.types'

// No live Neon project is used in CI. This mocks the Managed Better Auth endpoint and the
// Data API (PostgREST) at the network boundary with a small in-memory backend, and
// exercises the real app code end to end.

const USER_ID = '11111111-1111-1111-1111-111111111111'
const VEHICLE_ID = '22222222-2222-2222-2222-222222222222'

const VEHICLE = {
  id: VEHICLE_ID,
  user_id: USER_ID,
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

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = () =>
  `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: USER_ID, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`

const USER = {
  id: USER_ID,
  email: 'driver@example.com',
  name: 'Driver',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}
const SESSION = {
  id: 's1',
  token: 'session-token',
  userId: USER_ID,
  expiresAt: '2099-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

let seq = 0
function stored(over: Partial<FillUpRow>): FillUpRow {
  seq += 1
  return {
    id: `seed-${seq}`,
    user_id: USER_ID,
    vehicle_id: VEHICLE_ID,
    filled_at: '2026-10-01T08:00:00Z',
    odometer_km: 10000,
    litres: 40,
    total_cost: 1000,
    computer_l_per_100km: null,
    range_estimate_km: null,
    is_full_tank: true,
    missed_previous: false,
    station: null,
    fuel_grade: null,
    notes: null,
    created_at: '2026-10-01T08:00:00Z',
    ...over,
  }
}

interface Backend {
  rows: FillUpRow[]
  signedIn: boolean
  posts: Array<Record<string, unknown>>
  /** Respond to the next insert with this Postgres error instead of storing it. */
  rejectNextInsert: { code: string; message: string } | null
  /** Make inserts fail as if the network were unreachable. */
  networkDown: boolean
  signInAttempts: Array<Record<string, unknown>>
}

async function mockBackend(page: Page, seed: FillUpRow[] = [], { signedIn = false } = {}): Promise<Backend> {
  const backend: Backend = { rows: [...seed], signedIn, posts: [], rejectNextInsert: null, networkDown: false, signInAttempts: [] }

  const cors = (route: Route) => {
    const origin = route.request().headers()['origin'] ?? '*'
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
      'access-control-expose-headers': 'set-auth-jwt, set-auth-token',
    }
  }

  await page.route(
    (url) => !url.hostname.includes('localhost'),
    async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const headers = cors(route)
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })

      // --- Managed Better Auth ---
      if (url.pathname.endsWith('/auth/get-session')) {
        if (!backend.signedIn) return route.fulfill({ status: 200, headers, json: null })
        return route.fulfill({ status: 200, headers: { ...headers, 'set-auth-jwt': jwt() }, json: { session: SESSION, user: USER } })
      }
      if (url.pathname.endsWith('/auth/sign-in/email')) {
        // The mock backend has one account whose password nobody here knows.
        backend.signInAttempts.push(req.postDataJSON() as Record<string, unknown>)
        return route.fulfill({ status: 401, headers, json: { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' } })
      }

      // --- Data API ---
      if (url.pathname.endsWith('/rest/v1/vehicles')) return route.fulfill({ status: 200, headers, json: [VEHICLE] })
      if (url.pathname.endsWith('/rest/v1/fuel_prices')) return route.fulfill({ status: 200, headers, json: [] })
      if (url.pathname.endsWith('/rest/v1/fill_ups_enriched')) {
        return route.fulfill({ status: 200, headers, json: enrichFillUps(backend.rows) })
      }
      if (url.pathname.endsWith('/rest/v1/fill_ups')) {
        const id = url.searchParams.get('id')?.replace('eq.', '')
        switch (req.method()) {
          case 'POST': {
            if (backend.networkDown) return route.abort('failed')
            if (backend.rejectNextInsert) {
              const err = backend.rejectNextInsert
              backend.rejectNextInsert = null
              return route.fulfill({ status: 409, headers, json: err })
            }
            const payload = req.postDataJSON() as Record<string, unknown>
            backend.posts.push(payload)
            backend.rows.push(stored({ ...(payload as Partial<FillUpRow>), id: (payload.id as string) ?? `new-${backend.rows.length + 1}` }))
            return route.fulfill({ status: 201, headers, body: '' })
          }
          case 'PATCH':
            backend.rows = backend.rows.map((r) => (r.id === id ? { ...r, ...(req.postDataJSON() as Partial<FillUpRow>) } : r))
            return route.fulfill({ status: 204, headers, body: '' })
          case 'DELETE':
            backend.rows = backend.rows.filter((r) => r.id !== id)
            return route.fulfill({ status: 204, headers, body: '' })
        }
      }
      return route.fulfill({ status: 404, headers, json: { message: 'not mocked' } })
    },
  )
  return backend
}

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

test('the sign-in form sends the credentials and shows a rejected login', async ({ page }) => {
  const backend = await mockBackend(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Fuel' })).toBeVisible()
  await page.getByPlaceholder('you@example.com').fill('driver@example.com')
  await page.getByPlaceholder('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  expect(backend.signInAttempts).toEqual([{ email: 'driver@example.com', password: 'wrong-password' }])
  // No sign-up route exists in the UI.
  await expect(page.getByText(/sign up|create account/i)).toHaveCount(0)
})

test('log a fill-up dated yesterday', async ({ page }) => {
  const backend = await mockBackend(page, [], { signedIn: true })
  await page.goto('/')

  await expect(page.getByText('Log your first fill-up to bring this to life.')).toBeVisible()

  await page.getByRole('button', { name: 'Add fill-up' }).click()
  await expect(page.getByRole('heading', { name: 'Add fill-up' })).toBeVisible()

  await page.getByLabel('Odometer').fill('10500')
  await page.getByLabel('Litres').fill('40')
  await page.getByLabel('Total cost').fill('800')
  await page.getByRole('button', { name: 'Yesterday' }).click()
  await expect(page.getByText('Saving R800,00')).toBeVisible()

  await page.getByRole('button', { name: 'Save fill-up' }).click()
  await expect(page.getByRole('heading', { name: 'Add fill-up' })).not.toBeVisible()

  const yesterday = localDate(new Date(Date.now() - 86_400_000))
  expect(localDate(new Date(backend.posts[0].filled_at as string))).toBe(yesterday)

  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByText('First full tank: nothing to measure from yet')).toBeVisible()
  await expect(page.getByText('R800,00', { exact: true })).toBeVisible()
})

test('a server rejection is shown, not silently queued', async ({ page }) => {
  const backend = await mockBackend(page, [stored({ odometer_km: 10000 })], { signedIn: true })
  backend.rejectNextInsert = { code: '23505', message: 'duplicate key value violates unique constraint' }
  await page.goto('/')

  await page.getByRole('button', { name: 'Add fill-up' }).click()
  await page.getByLabel('Odometer').fill('10500')
  await page.getByLabel('Litres').fill('40')
  await page.getByLabel('Total cost').fill('800')
  await page.getByRole('button', { name: 'Save fill-up' }).click()

  await expect(page.getByRole('alert')).toContainText('already exists')
  await expect(page.getByRole('heading', { name: 'Add fill-up' })).toBeVisible()
  await expect(page.getByText(/pending/)).toHaveCount(0)
})

test('only an unreachable network queues the fill-up, and it can be retried', async ({ page }) => {
  const backend = await mockBackend(page, [stored({ odometer_km: 10000 })], { signedIn: true })
  backend.networkDown = true
  await page.goto('/')

  await page.getByRole('button', { name: 'Add fill-up' }).click()
  await page.getByLabel('Odometer').fill('10500')
  await page.getByLabel('Litres').fill('40')
  await page.getByLabel('Total cost').fill('800')
  await page.getByRole('button', { name: 'Save fill-up' }).click()

  await expect(page.getByRole('button', { name: '1 pending' })).toBeVisible()

  backend.networkDown = false
  await page.getByRole('button', { name: '1 pending' }).click()
  await page.getByRole('button', { name: 'Retry now' }).click()
  await expect(page.getByText('Everything has synced.')).toBeVisible()
  expect(backend.posts).toHaveLength(1)
})

test('measures across a partial top-up and explains the partial row', async ({ page }) => {
  await mockBackend(
    page,
    [
      stored({ odometer_km: 10000, litres: 40, total_cost: 1000, filled_at: '2026-10-01T08:00:00Z' }),
      stored({ odometer_km: 10300, litres: 20, total_cost: 500, is_full_tank: false, filled_at: '2026-10-05T08:00:00Z' }),
      stored({ odometer_km: 10600, litres: 25, total_cost: 650, filled_at: '2026-10-10T08:00:00Z' }),
    ],
    { signedIn: true },
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'History' }).click()

  await expect(page.getByText('7.50 L/100km')).toBeVisible() // (20 + 25) L over 600 km
  await expect(page.getByText('Partial fill: counted in your next full tank')).toBeVisible()
  await page.getByText('7.50 L/100km').click()
  await expect(page.getByText(/Measured over 2 fills/)).toBeVisible()
})

test('edit a fill-up from History', async ({ page }) => {
  const backend = await mockBackend(
    page,
    [
      stored({ id: 'a', odometer_km: 10000, litres: 40, total_cost: 1000, filled_at: '2026-10-01T08:00:00Z' }),
      stored({ id: 'b', odometer_km: 10500, litres: 30, total_cost: 780, filled_at: '2026-10-10T08:00:00Z' }),
    ],
    { signedIn: true },
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'History' }).click()

  await page.getByText('6.00 L/100km').click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: 'Edit fill-up' })).toBeVisible()

  await page.getByLabel('Litres').fill('35')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'Edit fill-up' })).not.toBeVisible()

  await expect(page.getByText('7.00 L/100km')).toBeVisible()
  expect(backend.rows.find((r) => r.id === 'b')?.litres).toBe(35)
  // The original day is untouched when only the numbers change.
  expect(backend.rows.find((r) => r.id === 'b')?.filled_at).toBe('2026-10-10T08:00:00Z')
})

test('delete needs a confirmation and can be undone', async ({ page }) => {
  const backend = await mockBackend(
    page,
    [
      stored({ id: 'a', odometer_km: 10000, filled_at: '2026-10-01T08:00:00Z' }),
      stored({ id: 'b', odometer_km: 10500, litres: 30, total_cost: 780, filled_at: '2026-10-10T08:00:00Z' }),
    ],
    { signedIn: true },
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'History' }).click()

  await page.getByText('6.00 L/100km').click()
  await page.getByRole('button', { name: 'Delete' }).click()
  expect(backend.rows).toHaveLength(2) // first tap only asks for confirmation
  await page.getByRole('button', { name: 'Confirm delete' }).click()

  await expect(page.getByText('Fill-up deleted')).toBeVisible()
  expect(backend.rows.map((r) => r.id)).toEqual(['a'])

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => backend.rows.map((r) => r.id).sort()).toEqual(['a', 'b'])
})
