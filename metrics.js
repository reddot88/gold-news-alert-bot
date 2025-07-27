// metrics.js
const axios = require("axios");
const METALPRICE_API_KEY = process.env.METALPRICE_API_KEY;

function formatTimestamp(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getMarketMetrics() {
  try {
    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${METALPRICE_API_KEY}&base=USD&currencies=XAU`;
    const response = await axios.get(url);

    const rate = response.data?.rates?.XAU;
    const timestamp = response.data?.timestamp;

    if (!rate || !timestamp) throw new Error("❌ Data tidak lengkap dari MetalpriceAPI");

    const xauInUsd = 1 / rate;

    return {
      ma50: null,
      ma200: null,
      rsi: null,
      usdStrength: 'unknown',
      currentPrice: parseFloat(xauInUsd.toFixed(2)),
      updatedAt: formatTimestamp(timestamp)
    };
  } catch (err) {
    console.error("❌ Error fetching metrics:", err.message);
    return {
      ma50: null,
      ma200: null,
      rsi: null,
      usdStrength: 'unknown',
      currentPrice: null,
      updatedAt: null
    };
  }
}

module.exports = { getMarketMetrics };
