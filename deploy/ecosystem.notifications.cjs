const path = require('node:path');
module.exports = { apps: [{
  name: 'taskmanager-notifications', cwd: path.resolve(__dirname, '..'),
  script: 'scripts/run-background-jobs.mjs', interpreter: 'node', instances: 1,
  autorestart: true, restart_delay: 3000, min_uptime: '10s', max_restarts: 20,
  max_memory_restart: '768M', kill_timeout: 45000, time: true,
  env: { NODE_ENV: 'production' },
}] };
