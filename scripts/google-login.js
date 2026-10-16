const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
require('./env');

async function visible(locator) {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    if (await locator.nth(i).isVisible()) return locator.nth(i);
  }
  return null;
}

async function login() {
  const email = process.env.PIONEER_EMAIL;
  if (!email) throw new Error('Set PIONEER_EMAIL in .env');
  const baseURL = new URL(process.env.BASE_URL || 'https://www.fly-up.app').origin;
  const authDir = path.join(__dirname, '../.auth');
  const authPath = path.join(authDir, 'pioneer.json');
  const browser = await chromium.launch({ headless: false });
  let context;
  let page;
  let stage = 'initializing';
  try {
    context = await browser.newContext({ storageState: fs.existsSync(authPath) ? authPath : undefined });
    page = await context.newPage();
    page.setDefaultTimeout(20_000);
    await require('./ui').cookies(page);
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
    const google = page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google', exact: true });
    await expect.poll(async () => {
      if (await page.locator('a[href="/pioneer/dashboard"]').count()) return 'session';
      if (await google.isVisible()) return 'login';
      return 'loading';
    }, { timeout: 45_000 }).toMatch(/^(session|login)$/);

    if (await google.isVisible()) {
      // Capture popups through the whole flow; Google may use the current tab.
      const popups = [];
      page.on('popup', popup => popups.push(popup));
      await google.click();
      const timeout = Number(process.env.GOOGLE_LOGIN_TIMEOUT_MS || 120000);
      const deadline = Date.now() + timeout;
      const attempted = new Set();
      let authenticated = false;
      if (process.env.MANUAL_GOOGLE_LOGIN === 'true') {
        console.log('Complete Google sign-in/security verification in the open browser. Waiting for FlyUp to return automatically.');
      }
      while (Date.now() < deadline) {
        if (page.isClosed()) throw new Error('The FlyUp login tab was closed');
        if (await page.locator('a[href="/pioneer/dashboard"]').count()) {
          authenticated = true;
          break;
        }
        const tabs = [...popups, ...context.pages().filter(p => p !== page)];
        const oauth = [...new Set(tabs)].reverse().find(p => !p.isClosed() && new URL(p.url()).hostname === 'accounts.google.com')
          || (!page.isClosed() && new URL(page.url()).hostname === 'accounts.google.com' ? page : null);
        if (!oauth || process.env.MANUAL_GOOGLE_LOGIN === 'true') {
          stage = oauth ? 'manual Google verification' : 'waiting for Google window or FlyUp callback';
          await page.waitForTimeout(250);
          continue;
        }
        const text = await oauth.locator('body').innerText();
        if (/browser or app may not be secure|couldn.t sign you in|เบราว์เซอร์หรือแอปนี้อาจไม่ปลอดภัย|เบราว์เซอร์.*ไม่ปลอดภัย/i.test(text)) {
          stage = 'Google blocked automated sign-in';
          throw new Error('Google blocked this automated browser. Use MANUAL_GOOGLE_LOGIN=true or a permitted test login; this script does not bypass Google security.');
        }
        if (/2-step verification|verify it.s you|check your phone|enter the code|ยืนยันว่าเป็นคุณ|การยืนยันแบบ 2 ขั้นตอน|ตรวจสอบโทรศัพท์|ป้อนรหัส|captcha/i.test(text)
          || await oauth.locator('iframe[src*="recaptcha"]').count()) {
          stage = 'Google additional security verification';
          throw new Error('Google requires OTP/CAPTCHA/device verification. Set MANUAL_GOOGLE_LOGIN=true and complete it yourself.');
        }
        const password = await visible(oauth.locator('input[type="password"]'));
        if (password) {
          stage = 'Google password';
          if (!attempted.has('password')) {
            if (!process.env.GOOGLE_PASSWORD) throw new Error('Set GOOGLE_PASSWORD in .env');
            attempted.add('password');
            await password.fill(process.env.GOOGLE_PASSWORD);
            await oauth.getByRole('button', { name: /^(Next|ถัดไป)$/i }).click();
          } else if (/wrong password|รหัสผ่านไม่ถูกต้อง|รหัสผ่านผิด/i.test(text)) {
            throw new Error('Google rejected the password; no automatic retries were made');
          }
        } else {
          const identifier = await visible(oauth.locator('input[type="email"]'));
          const account = await visible(oauth.locator('[data-identifier]').filter({ hasText: email }));
          const emailText = await visible(oauth.getByText(email, { exact: true }));
          const another = await visible(oauth.getByText(/^(Use another account|ใช้บัญชีอื่น)$/i));
          const consent = await visible(oauth.getByRole('button', { name: /^(Continue|ดำเนินการต่อ)$/i }));
          if (identifier && !attempted.has('email')) {
            stage = 'Google email';
            attempted.add('email');
            await identifier.fill(email);
            await oauth.getByRole('button', { name: /^(Next|ถัดไป)$/i }).click();
          } else if (consent && !attempted.has('continue')) {
            stage = 'Google sign-in consent';
            // Only ordinary identity sign-in consent is handled automatically.
            if (!/fly.?up/i.test(text) || /delete|manage your|read.*mail|send.*mail|ลบข้อมูล|จัดการ.*ไดรฟ์|อ่าน.*อีเมล/i.test(text)) {
              throw new Error('Google shows an unrecognized permission request; review it manually');
            }
            attempted.add('continue');
            await consent.click();
          } else if ((account || emailText) && !attempted.has('account')) {
            stage = 'Google account selection';
            attempted.add('account');
            await (account || emailText).click();
          } else if (another && !attempted.has('another-account')) {
            stage = 'Google use another account';
            attempted.add('another-account');
            await another.click();
          } else {
            stage = 'waiting for Google transition or permission screen';
          }
        }
        await page.waitForTimeout(250);
      }
      if (!authenticated) {
        throw new Error(`Google login did not finish at stage: ${stage}. See .auth/login-diagnostic.json; no login success is assumed.`);
      }
    }
    stage = 'verifying Pioneer profile';
    await page.goto(`${baseURL}/pioneer/profile`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'ตั้งค่าโปรไฟล์', exact: true })).toBeVisible({ timeout: 45_000 });
    await expect.poll(() => page.locator('input[disabled]').evaluateAll(es => es.map(e => e.value)), { timeout: 20_000 }).toContain(email);
    await expect(page.getByText('Pioneer', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'ยืนยันตัวตน', exact: true }).click();
    await expect(page.getByText(/ยืนยันตัวตนสำเร็จ/)).toBeVisible();
    fs.mkdirSync(authDir, { recursive: true });
    await context.storageState({ path: authPath, indexedDB: true });
    console.log('Verified Pioneer Google login and KYC; session saved.');
  } catch (error) {
    fs.mkdirSync(authDir, { recursive: true });
    // Exclude credentials and OAuth query parameters/tokens from diagnostics.
    fs.writeFileSync(path.join(authDir, 'login-diagnostic.json'), JSON.stringify({
      stage,
      tabs: context ? context.pages().filter(p => !p.isClosed()).map(p => {
        const url = new URL(p.url());
        return { origin: url.origin, pathname: url.pathname };
      }) : []
    }, null, 2));
    throw error;
  } finally { await browser.close(); }
}
module.exports = login;
if (require.main === module) login().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
