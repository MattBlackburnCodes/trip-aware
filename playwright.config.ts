import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4184'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4184 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})

