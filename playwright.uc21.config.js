const config = require('./playwright.all.config');
module.exports = {
  ...config,
  workers: 1,
  projects: config.projects.filter(project => project.name === 'project-review')
};
