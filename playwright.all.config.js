const { defineConfig } = require('@playwright/test');
const path = require('node:path');
require('./scripts/env');

module.exports = defineConfig({
  testDir: './tests',
  // Run files/projects concurrently; keep cases in each file sequential.
  fullyParallel: false,
  workers: 4,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://www.fly-up.app',
    browserName: 'chromium', headless: false,
    actionTimeout: 30_000, navigationTimeout: 60_000,
    storageState: { cookies: [], origins: [] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure', video: 'retain-on-failure'
  },
  projects: [
    { name: 'disbursements', testMatch: 'disbursements.spec.js' },
    { name: 'project-review', testMatch: 'project-review.spec.js' },
    { name: 'setup-booster', testDir: './scripts', testMatch: 'auth-booster.setup.js' },
    { name: 'setup-pioneer', testDir: './scripts', testMatch: 'auth-pioneer.setup.js' },
    { name: 'login', testMatch: 'login.spec.js' },
    { name: 'register', testMatch: 'Register.spec.js' },
    { name: 'investment', testMatch: 'invest.spec.js', dependencies: ['setup-booster'],
      use: { storageState: path.join(__dirname, '.auth/booster.json') } },
    { name: 'complaints', testMatch: 'complaints.spec.js', dependencies: ['setup-booster'],
      use: { storageState: path.join(__dirname, '.auth/booster.json') } },
    { name: 'create-project', testMatch: 'create-project.spec.js', dependencies: ['setup-pioneer'],
      use: { storageState: path.join(__dirname, '.auth/pioneer.json') } }
  ]
});
