const fs = require('node:fs');
const path = require('node:path');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile !== 'function') {
    throw new Error('Please use Node.js 22 or newer to load .env');
  }
  process.loadEnvFile(envPath);
}
