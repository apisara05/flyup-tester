const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
require('./env');

async function loginAdmin(existingBrowser) {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  const baseURL = process.env.BASE_URL || 'https://www.fly-up.app';
  const statePath = path.resolve(__dirname, '..', process.env.COMPLAINT_ADMIN_STATE || '.auth/admin.json');
  const browser = existingBrowser || await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: fs.existsSync(statePath) ? statePath : undefined
  }); // No login screenshots/traces containing credentials; never inherit Booster state.
  let page;
  let stage = 'opening login';
  try {
    page = await context.newPage();
    await require('./cookies')(page);
    await page.goto(new URL('/login', baseURL).href, { waitUntil: 'domcontentloaded' });
    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');
    const submit = page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true });
    let initialState;
    stage = 'waiting for login form or existing session';
    await expect.poll(async () => {
      const url = new URL(page.url());
      if (url.origin === new URL(baseURL).origin && !/^\/login\/?$/.test(url.pathname)) return (initialState = 'redirected');
      if (await email.isVisible() && await password.isVisible() && await submit.isVisible()) return (initialState = 'form');
      return 'loading';
    }, { timeout: 45_000, message: 'Admin: expected a rendered login form or session redirect; see .auth/admin-login-diagnostic.json if it fails' }).toMatch(/^(form|redirected)$/);
    if (initialState === 'form') {
      stage = 'filling password login';
      await expect(page.getByRole('heading', { name: 'ยินดีต้อนรับกลับ', exact: true })).toBeVisible();
      await email.fill(ADMIN_EMAIL);
      await password.fill(ADMIN_PASSWORD);
      // Compare booleans so a failed assertion never prints the password.
      await expect.poll(async () => (await email.inputValue()) === ADMIN_EMAIL &&
        (await password.inputValue()) === ADMIN_PASSWORD,
      { timeout: 5_000, message: 'Admin login form changed before submit' }).toBe(true);
      await expect(submit).toBeEnabled();
      await submit.click();
      stage = 'waiting for login response';
    let state;
    await expect.poll(async () => {
      if (await page.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง', { exact: true }).isVisible()) return (state = 'rejected');
      const url = new URL(page.url());
      if (url.origin === new URL(baseURL).origin && !/^\/login\/?$/.test(url.pathname)) return (state = 'signed-in');
      return 'pending';
    }, { timeout: 30_000, message: 'Wait for login completion or explicit login rejection' }).toMatch(/^(signed-in|rejected)$/);
    if (state === 'rejected') throw new Error('Admin login rejected: อีเมลหรือรหัสผ่านไม่ถูกต้อง. No QA complaint was submitted.');
    }
    // These routes were verified from the real Admin navigation.
    stage = 'verifying Admin role';
    await page.goto(new URL('/admin/dashboard', baseURL).href);
    await expect(page.getByText('Admin', { exact: true })).toBeVisible();
    const complaints = page.locator('a[href="/admin/complaints"]');
    await expect(complaints).toHaveCount(1);
    await page.goto(new URL(await complaints.getAttribute('href'), baseURL).href);
    await expect(page.getByRole('heading', { name: /คำร้องเรียน|การร้องเรียน/ }).first()).toBeVisible();
    expect(new URL(page.url()).pathname).toMatch(/^\/admin(?:\/|$)/);
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    await context.storageState({ path: statePath });
    const result = { statePath, listURL: page.url() };
    fs.mkdirSync(path.join(__dirname, '../.auth'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '../.auth/admin-location.json'), JSON.stringify(result, null, 2));
    console.log('Admin login verified; complaints URL and session saved.');
    return result;
  } catch (error) {
    const diagnosticPath = path.join(__dirname, '../.auth/admin-login-diagnostic.json');
    const url = new URL(page ? page.url() : 'about:blank');
    fs.mkdirSync(path.dirname(diagnosticPath), { recursive: true });
    fs.writeFileSync(diagnosticPath, JSON.stringify({ stage, origin: url.origin, pathname: url.pathname,
      emailFieldVisible: page ? await emailVisible(page) : false }, null, 2));
    throw error;
  } finally {
    await context.close();
    if (!existingBrowser) await browser.close();
  }
}
async function emailVisible(page) {
  if (page.isClosed()) return false;
  return page.locator('input[name="email"]').isVisible().catch(() => false);
}
module.exports = loginAdmin;
if (require.main === module) loginAdmin().catch(error => { console.error(error.message); process.exitCode = 1; });
