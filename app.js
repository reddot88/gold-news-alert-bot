// ai-news-alert-bot/app.js (Combined Server + Scraper)

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');
const { getMarketMetrics } = require('./metrics');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEBHOOK_URL = `http://localhost:${PORT}/news`; // Local call to internal webhook

const KEYWORDS = ['gold', 'fed', 'cpi', 'inflation', 'interest', 'fomc', 'powell'];
let lastPostedTitle = '';

// News Scraper (RSS + Keyword Filter)
async function fetchFXStreetRSS() {
  try {
    console.log("🟡 fetchFXStreetRSS() triggered!");
    const { data } = await axios.get('https://www.fxstreet.com/rss/news');
    const parsed = await xml2js.parseStringPromise(data);
    const items = parsed.rss.channel[0].item;
    if (!items || items.length === 0) return;

    const topItems = items.slice(0, 5);
    for (const item of topItems) {
      const title = item.title[0];
      const content = item.description[0];
      if (!title || title === lastPostedTitle) continue;

      const isRelevant = KEYWORDS.some(keyword => (title + content).toLowerCase().includes(keyword));
      if (isRelevant) {
        await axios.post(WEBHOOK_URL, { title, content });
        lastPostedTitle = title;
        console.log("📬 News matched & sent to internal webhook.");
        break;
      }
    }
  } catch (err) {
    console.error('❌ RSS scrape error:', err.message);
  }
}

// ChatGPT Analysis
async function analyzeWithChatGPT(newsText) {
  const prompt = `
Berikut adalah sebuah berita ekonomi:

\"\"\"${newsText}\"\"\"

1. Tolong analisa berita tersebut dalam *Bahasa Indonesia*, fokus pada nada kebijakan moneter (hawkish/dovish/netral) dan pengaruhnya terhadap harga emas.
2. Berikan penjelasan singkat dalam 2–3 poin.
3. Akhiri dengan satu baris prediksi arah harga emas, dalam format:
Prediksi: Bullish / Bearish / Netral
`;

  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  }, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices[0].message.content.trim();
}

// Dummy MA
async function getMovingAverages() {
  return { ma50: 3005, ma200: 2960, currentPrice: 3020 };
}

// Format Telegram Message
function formatTelegramMessage(title, analysis, prediction, metrics) {
  const waktu = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const hargaInfo = metrics.currentPrice
    ? `💰 *Harga Emas (XAU/USD):* $${metrics.currentPrice}\n⏱️ *Update Harga:* ${metrics.updatedAt}`
    : `💰 *Harga Emas:* Tidak tersedia`;

  const market = await getMarketMetrics();
  const hargaEmas = market.currentPrice ? `\$${market.currentPrice} (update: ${market.updatedAt})` : 'Tidak tersedia';

  return `📰 *Berita Penting Terdeteksi!*\n\n` +
         `📌 *Judul Berita:*\n${title}\n\n` +
         `🧠 *Analisa:*\n${cleanAnalysis(analysis)}\n\n` +
         `📊 *Prediksi Arah Harga Emas:*\n${prediction}\n\n` +
         `💰 *Harga Emas:*\n${hargaEmas}\n\n` +
         `${hargaInfo}\n\n` +
         `🕒 *Waktu:* ${waktu}`;
}


// Sanitasi message
function sanitizeMarkdown(text) {
  return text
    .replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&") // escape karakter markdown
    .slice(0, 4000); // batasi ke 4000 karakter
}

function cleanAnalysis(text) {
  return text
    .replace(/3\.\s*Prediksi:.*$/gi, '')  // hapus baris prediksi yang diawali dengan "3. Prediksi:"
    .replace(/Prediksi:\s*(Bullish|Bearish|Netral)/gi, '') // hapus sisipan prediksi apapun
    .trim();
}


// Send to Telegram
function escapeMarkdownV2(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

async function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown' // ✅ Ganti dari 'MarkdownV2'
  });
}


// Webhook Endpoint
app.post('/news', async (req, res) => {
  try {
    const { title, content } = req.body;
    const analysis = await analyzeWithChatGPT(content);
    const match = analysis.match(/Prediksi:\s*(Bullish|Bearish|Netral)/i);
    const prediction = match ? match[1] : 'Netral';

    const metrics = await getMarketMetrics();
    console.log("🧾 Metrics:", metrics);

    const message = formatTelegramMessage(title, analysis, prediction, metrics);

    await sendToTelegram(message);
    console.log("📬 Sent to Telegram");
    res.status(200).send('✅ News processed');
  } catch (err) {
    console.error("❌ Failed to process /news:", err.message);
    res.status(500).send("Server error");
  }
});


// Start Server + Cron
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  fetchFXStreetRSS();
  cron.schedule('*/15 * * * *', fetchFXStreetRSS);
  console.log("🤖 RSS bot scheduler initialized.");
});
