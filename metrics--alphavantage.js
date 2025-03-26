const axios = require("axios");
const ALPHA_KEY = process.env.ALPHA_VANTAGE_KEY;

async function getMarketMetrics() {
  try {
    const base = "https://www.alphavantage.co/query";

  const [ma50Res, ma200Res, rsiRes, dxyRes, priceRes] = await Promise.all([
    axios.get(`${base}?function=SMA&from_symbol=XAU&to_symbol=USD&interval=60min&time_period=50&series_type=close&apikey=${ALPHA_KEY}`),
    axios.get(`${base}?function=SMA&from_symbol=XAU&to_symbol=USD&interval=60min&time_period=200&series_type=close&apikey=${ALPHA_KEY}`),
    axios.get(`${base}?function=RSI&from_symbol=XAU&to_symbol=USD&interval=60min&time_period=14&series_type=close&apikey=${ALPHA_KEY}`),
    axios.get(`${base}?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=EUR&apikey=${ALPHA_KEY}`),
    axios.get(`${base}?function=GLOBAL_QUOTE&symbol=XAUUSD&apikey=${ALPHA_KEY}`)
  ]);

    // Debug logs
    console.log("MA50:", ma50Res.data);
    console.log("MA200:", ma200Res.data);
    console.log("RSI:", rsiRes.data);
    console.log("DXY:", dxyRes.data);
    console.log("Price:", priceRes.data);

    const getSMA = (data) => {
      const series = data["Technical Analysis: SMA"];
      if (!series) return null;
      const latest = Object.values(series)[0];
      return parseFloat(latest["SMA"]);
    };
    
    const getRSI = (data) => {
      const series = data["Technical Analysis: RSI"];
      if (!series) return null;
      const latest = Object.values(series)[0];
      return parseFloat(latest["RSI"]);
    };
    
    const ma50 = getSMA(ma50Res.data);
    const ma200 = getSMA(ma200Res.data);
    const rsi = getRSI(rsiRes.data);

    const dxy = parseFloat(dxyRes?.data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"]) || null;
    const currentPrice = parseFloat(priceRes?.data?.["Global Quote"]?.["05. price"]) || null;

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
