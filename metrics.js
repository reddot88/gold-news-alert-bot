// metrics.js
const axios = require("axios");
const TWELVE_API_KEY = process.env.TWELVE_API_KEY;

async function getMarketMetrics() {
  try {
    const baseUrl = "https://api.twelvedata.com";
    const [ma50Res, ma200Res, rsiRes, dxyRes] = await Promise.all([
      axios.get(`${baseUrl}/ma?symbol=XAU/USD&interval=1h&time_period=50&apikey=${TWELVE_API_KEY}`),
      axios.get(`${baseUrl}/ma?symbol=XAU/USD&interval=1h&time_period=200&apikey=${TWELVE_API_KEY}`),
      axios.get(`${baseUrl}/rsi?symbol=XAU/USD&interval=1h&time_period=14&apikey=${TWELVE_API_KEY}`),
      axios.get(`${baseUrl}/quote?symbol=DXY&apikey=${TWELVE_API_KEY}`),
    ]);

    const ma50 = parseFloat(ma50Res.data.value);
    const ma200 = parseFloat(ma200Res.data.value);
    const rsi = parseFloat(rsiRes.data.value);
    const dxy = parseFloat(dxyRes.data.close);

    let usdStrength = "neutral";
    if (dxy > 105) usdStrength = "strong";
    else if (dxy < 103) usdStrength = "weak";

    return { ma50, ma200, rsi, usdStrength };
  } catch (err) {
    console.error("❌ Error fetching metrics:", err.message);
    return { ma50: null, ma200: null, rsi: null, usdStrength: "unknown" };
  }
}

module.exports = { getMarketMetrics };
