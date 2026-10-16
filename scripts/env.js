const fs = require('node:fs');
const file = require('node:path').join(__dirname, '../.env');
if (fs.existsSync(file)) process.loadEnvFile(file);
