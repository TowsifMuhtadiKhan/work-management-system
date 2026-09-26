import { defineConfig } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 5174)

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  use: { baseURL: `http://localhost:${port}`, headless: true },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 30000,
  },
})
