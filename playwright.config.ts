import { defineConfig, devices } from '@playwright/test'

const ci = Boolean(process.env.CI)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://127.0.0.1:4000/health',
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
  ],
})
