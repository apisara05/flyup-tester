const { defineConfig } = require('@playwright/test');
require('./scripts/load-env');

module.exports = defineConfig({
  globalSetup: require.resolve('./scripts/global-setup'),
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    storageState: require('node:path').join(__dirname, '.auth', 'booster.json'),
    baseURL: process.env.BASE_URL || 'https://www.fly-up.app',
    browserName: 'chromium',
    headless: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    locale: 'th-TH'
  }
});
