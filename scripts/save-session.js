const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const readline = require('node:readline/promises');
require('./load-env');

(async () => {
  const role = process.argv[2] || 'booster';
  if (role === 'booster' && process.env.AUTO_LOGIN === 'true') {
    await require('./auto-login')();
    return;
  }
  if (!['booster', 'admin', 'owner', 'no-kyc', 'no-bank'].includes(role)) {
    throw new Error('Unknown account role');
  }
  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(process.env.BASE_URL || 'https://www.fly-up.app');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await rl.question(`Login manually as ${role}, verify account/role, then press Enter here: `);
    rl.close();
    fs.mkdirSync('.auth', { recursive: true });
    await context.storageState({ path: `.auth/${role}.json` });
    console.log(`Saved .auth/${role}.json (contains login session; keep private)`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
