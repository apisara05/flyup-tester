const { defineConfig } = require('@playwright/test');
const path = require('node:path');
require('./scripts/env');
module.exports = defineConfig({
  testDir: './tests', testMatch: 'create-project.spec.js',
  grep: /TC14_001/, workers: 1, fullyParallel: false, retries: 0,
  timeout: 300_000, expect: { timeout: 20_000 },
  globalSetup: require.resolve('./scripts/setup'),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://www.fly-up.app',
    storageState: path.join(__dirname, '.auth/pioneer.json'),
    headless: false, actionTimeout: 30_000, navigationTimeout: 60_000,
    screenshot: 'only-on-failure', trace: 'retain-on-failure', video: 'retain-on-failure'
  }
});
