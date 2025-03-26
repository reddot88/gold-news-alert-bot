// metrics.js
const axios = require("axios");
const ALPHA_KEY = process.env.ALPHA_VANTAGE_KEY;

async function getMarketMetrics() {
  try {
    const base = "https://www.alphavantage.co/query";

    const [ma50Res, ma200Res, rsiRes, dxyRes, priceRes] = await Promise.all([
      axios.get(`${base}?function=SMA&symbol=XAUUSD&interval=60min&time_period=50&series_type=close&apikey=${ALPHA_KEY}`),
      axios.get(`${base}?function=SMA&symbol=XAUUSD&interval=60min&time_period=200&series_type=close&apikey=${ALPHA_KEY}`),
      axios.get(`${base}?function=RSI&symbol=XAUUSD&interval=60min&time_period=14&series_type=close&apikey=${ALPHA_KEY}`),
      axios.get(`${base}?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=EUR&apikey=${ALPHA_KEY}`),
      axios.get(`${base}?function=GLOBAL_QUOTE&symbol=XAUUSD&apikey=${ALPHA_KEY}`)
    ]);

    const extractLastValue = (series) => {
      const keys = Object.keys(series);
      return parseFloat(series[keys[0]]);
    };

    const ma50 = extractLastValue(ma50Res.data["Technical Analysis: SMA"]);
    const ma200 = extractLastValue(ma200Res.data["Technical Analysis: SMA"]);
    const rsi = extractLastValue(rsiRes.data["Technical Analysis: RSI"]);
    const dxy = parseFloat(dxyRes.data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]);
    const currentPrice = parseFloat(priceRes.data["Global Quote"]["05. price"]);

    let usdStrength = "neutral";
    if (dxy > 0.93) usdStrength = "strong";
    else if (dxy < 0.91) usdStrength = "weak";

    return { ma50, ma200, rsi, usdStrength, currentPrice };
  } catch (err) {
    console.error("❌ Error fetching metrics:", err.message);
    return {
      ma50: null,
      ma200: null,
      rsi: null,
      usdStrength: "unknown",
      currentPrice: null,
    };
  }
}

module.exports = { getMarketMetrics };
