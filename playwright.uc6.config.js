const config = require('./playwright.all.config');
module.exports = {
  ...config, workers: 1,
  projects: config.projects.filter(project => ['setup-booster', 'complaints'].includes(project.name))
};
