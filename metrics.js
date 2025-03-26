// metrics.js (using Finnhub)
const axios = require("axios");
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

async function getMarketMetrics() {
  try {
    const baseUrl = "https://finnhub.io/api/v1";

    const [xauQuote, maData, rsiData, eurusd] = await Promise.all([
      axios.get(`${baseUrl}/quote?symbol=OANDA:XAU_USD&token=${FINNHUB_KEY}`),
      axios.get(`${baseUrl}/indicator?symbol=OANDA:XAU_USD&resolution=60&indicator=ma&timeperiod=50&token=${FINNHUB_KEY}`),
      axios.get(`${baseUrl}/indicator?symbol=OANDA:XAU_USD&resolution=60&indicator=rsi&timeperiod=14&token=${FINNHUB_KEY}`),
      axios.get(`${baseUrl}/quote?symbol=OANDA:EUR_USD&token=${FINNHUB_KEY}`),
    ]);

    const ma50 = maData.data?.technicalAnalysis?.MA?.slice(-1)[0] || null;
    const ma200 = null; // Finnhub free tier supports one MA at a time
    const rsi = rsiData.data?.technicalAnalysis?.RSI?.slice(-1)[0] || null;
    const currentPrice = xauQuote.data?.c || null;

    // Estimate USD strength from EUR/USD
    const eurusdRate = eurusd.data?.c;
    let usdStrength = "neutral";
    if (eurusdRate && eurusdRate < 1.06) usdStrength = "strong";
    else if (eurusdRate && eurusdRate > 1.09) usdStrength = "weak";

    return { ma50, ma200, rsi, usdStrength, currentPrice };
  } catch (err) {
    console.error("❌ Error fetching metrics:", err.message);
    return { ma50: null, ma200: null, rsi: null, usdStrength: "unknown", currentPrice: null };
  }
}

module.exports = { getMarketMetrics };
