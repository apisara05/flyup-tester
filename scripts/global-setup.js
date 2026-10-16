const autoLogin = require('./auto-login');
module.exports = async function () {
  if (process.env.AUTO_LOGIN === 'true') await autoLogin();
};
