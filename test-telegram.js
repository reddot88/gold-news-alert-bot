const axios = require('axios');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const testMessage = `
📰 *Tes Pesan Markdown Telegram*

Ini adalah _contoh_ *pesan tebal* dan miring. Pastikan karakter seperti ( ) - _ * tidak menyebabkan error.

📊 *Prediksi:* Bullish

🕒 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
`;

(async () => {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: testMessage,
      parse_mode: "Markdown"
    });
    console.log("✅ Berhasil kirim tes pesan ke Telegram");
  } catch (err) {
    console.error("❌ Gagal kirim ke Telegram:", err.response?.data || err.message);
  }
})();
