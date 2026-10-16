const { test } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
test('prepare Booster session', async () => {
  if (process.env.AUTO_LOGIN !== 'false') await require('./auto-login')();
  else if (!fs.existsSync(path.join(__dirname, '../.auth/booster.json'))) {
    throw new Error('Missing Booster session; enable AUTO_LOGIN');
  }
});
