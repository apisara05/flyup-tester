const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
require('./load-env');

async function autoLogin() {
  const { LOGIN_EMAIL, LOGIN_PASSWORD } = process.env;
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) throw new Error('Set LOGIN_EMAIL and LOGIN_PASSWORD in .env');
  const origin = new URL(process.env.BASE_URL || 'https://www.fly-up.app').origin;
  const browser = await chromium.launch({ headless: false });
  try {
    // Never record credentials in traces/screenshots/video during login.
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    await require('./cookies')(page);
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill(LOGIN_EMAIL);
    await page.locator('input[name="password"]').fill(LOGIN_PASSWORD);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await page.waitForURL(url => url.origin === origin && url.pathname !== '/login', { timeout: 45_000 });
    await page.goto(`${origin}/booster/profile`);
    await expect(page.getByRole('heading', { name: 'ตั้งค่าโปรไฟล์', exact: true })).toBeVisible();
    await expect.poll(() => page.locator('input[disabled]').evaluateAll(
      inputs => inputs.map(input => input.value)
    )).toContain(LOGIN_EMAIL);
    await expect(page.getByText('Booster', { exact: true })).toBeVisible();
    const authDir = path.join(__dirname, '..', '.auth');
    fs.mkdirSync(authDir, { recursive: true });
    await context.storageState({ path: path.join(authDir, 'booster.json') });
    console.log('Booster login verified; session saved.');
  } finally {
    await browser.close();
  }
}
module.exports = autoLogin;
if (require.main === module) autoLogin().catch(() => {
  console.error('Auto login failed. Check credentials, account role and website availability.');
  process.exitCode = 1;
});
