// test-metrics.js
require('dotenv').config();
const { getMarketMetrics } = require('./metrics');

(async () => {
  const metrics = await getMarketMetrics();
  console.log("📊 Market Metrics Result:");
  console.log(metrics);
})();
