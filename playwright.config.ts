import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5183',
    trace: 'retain-on-failure',
  },
  // Chromium mobile emulation — WebKit isn't available in this environment. This
  // covers the interaction logic; actual iOS Safari behaviour (safe-area insets,
  // backdrop-filter performance) still needs the physical-phone check in spec §13.
  // PLAYWRIGHT_CHROMIUM_PATH lets sandboxes without the matching bundled browser reuse a
  // system Chromium; unset, Playwright uses its own as usual.
  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ['--no-sandbox'] }
          : {},
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    url: 'http://localhost:5183',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_NEON_URL: 'https://placeholder.neon.tech/neondb',
    },
  },
})
