import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration',
  workers: 1,
  outputDir: 'test-results/connected',
  timeout: 30000,
  use: { baseURL: 'http://localhost:4174', headless: true, screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run preview -- --outDir dist-connected --port 4174',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
