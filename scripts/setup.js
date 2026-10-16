require('./env');
module.exports = async () => {
  if (process.env.AUTO_LOGIN !== 'false') await require('./google-login')();
};
