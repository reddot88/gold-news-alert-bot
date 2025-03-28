const cron = require('node-cron');
const { checkPullbackSignal } = require('./pullback-alert');

console.log('Gold pullback alert scheduler started...');

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Checking gold pullback signal...`);
  await checkPullbackSignal();
});
