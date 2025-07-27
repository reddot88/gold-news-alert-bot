const axios = require("axios");
require('dotenv').config();

const METALPRICE_API_KEY = process.env.METALPRICE_API_KEY;

async function getMarketMetrics() {
  try {
    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${METALPRICE_API_KEY}&base=USD&currencies=XAU`;
    const response = await axios.get(url);

    console.log("📦 Response MetalpriceAPI:", response.data);
    console.log("🔑 API Key Loaded:", METALPRICE_API_KEY);

    const rate = response.data?.rates?.XAU;
    const timestamp = response.data?.timestamp;

    if (!rate) {
      throw new Error("❌ Data tidak lengkap dari MetalpriceAPI");
    }

    const xauInUsd = 1 / rate;

    return {
      ma50: null,
      ma200: null,
      rsi: null,
      usdStrength: 'unknown',
      currentPrice: parseFloat(xauInUsd.toFixed(2)),
      updatedAt: new Date(timestamp * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
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
