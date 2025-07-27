// metrics.js (using MetalpriceAPI)
const axios = require("axios");
const METALPRICE_API_KEY = process.env.METALPRICE_API_KEY;

async function getMarketMetrics() {
  try {
    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${METALPRICE_API_KEY}&base=USD&currencies=XAU`;
    const response = await axios.get(url);

    const rate = response.data?.rates?.XAU;
    const xauInUsd = rate ? 1 / rate : null;
    const timestamp = response.data?.timestamp;

    const updatedAt = timestamp
      ? new Date(timestamp * 1000).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Tidak tersedia';

    return {
      ma50: null,             // Not available on MetalpriceAPI
      ma200: null,            // Not available on MetalpriceAPI
      rsi: null,              // Not available on MetalpriceAPI
      usdStrength: 'unknown', // Not provided
      currentPrice: xauInUsd ? parseFloat(xauInUsd.toFixed(2)) : null,
      updatedAt               // ✅ baru ditambahkan
    };
  } catch (err) {
    console.error("❌ Error fetching metrics:", err.message);
    return {
      ma50: null,
      ma200: null,
      rsi: null,
      usdStrength: 'unknown',
      currentPrice: null,
      updatedAt: 'Tidak tersedia'
    };
  }
}

module.exports = { getMarketMetrics };
