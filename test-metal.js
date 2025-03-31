const axios = require('axios');
require('dotenv').config();

async function getMetalPrice() {
  try {
    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${process.env.METALPRICE_API_KEY}&base=USD&currencies=XAU`;
    const response = await axios.get(url);
    const rate = response.data?.rates?.XAU;
    const price = rate ? 1 / rate : null;
    console.log("✅ Live Gold Price (USD):", price);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

getMetalPrice();
