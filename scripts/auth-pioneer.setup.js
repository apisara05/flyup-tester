const { test } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
test('prepare Pioneer session', async () => {
  if (process.env.AUTO_LOGIN !== 'false') await require('./google-login')();
  else if (!fs.existsSync(path.join(__dirname, '../.auth/pioneer.json'))) {
    throw new Error('Missing Pioneer session; enable AUTO_LOGIN');
  }
});
