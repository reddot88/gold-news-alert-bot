// ai-news-alert-bot/app.js (Combined Server + Scraper)

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');
const { getMarketMetrics } = require('./metrics');
const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEBHOOK_URL = `http://localhost:${PORT}/news`; // Local call to internal webhook

const cheerio = require('cheerio'); // Untuk ambil konten dari halaman berita
const { Configuration, OpenAIApi } = require("openai");

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Cek apakah pesan adalah link berita
  if (text && text.startsWith('http')) {
    try {
      await bot.sendMessage(chatId, "🔍 Membaca isi berita...");

      const { data: html } = await axios.get(text);
      const $ = cheerio.load(html);

      // Ambil title & isi utama halaman
      const title = $('title').text();
      const content = $('p').map((i, el) => $(el).text()).get().join('\n');
      const prompt = `Berikut adalah isi berita:\n\nJudul: ${title}\n\nIsi:\n${content}\n\nBerikan analisis dampaknya terhadap harga emas (XAU/USD), apakah bersifat bullish atau bearish terhadap USD dan XAU?`;

      const gptRes = await openai.createChatCompletion({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert macroeconomic and gold analyst. Analyze the news based on its impact on USD and XAU/USD." },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const analysis = gptRes.data.choices[0].message.content;
      await bot.sendMessage(chatId, `✅ Analisis selesai:\n\n${analysis}`);
    } catch (err) {
      console.error("❌ Error saat analisa berita:", err.message);
      await bot.sendMessage(chatId, "⚠️ Gagal membaca atau menganalisa berita. Pastikan link valid.");
    }
  }
});

const puppeteer = require('puppeteer');

async function scrapeInvestingArticle(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36'
  );

  await page.goto(url, { waitUntil: 'networkidle2' });

  const result = await page.evaluate(() => {
    const title = document.querySelector('h1')?.innerText;
    const content = Array.from(document.querySelectorAll('div.WYSIWYG.articlePage > p'))
                         .map(p => p.innerText)
                         .join('\n\n');
    return { title, content };
  });

  await browser.close();
  return result;
}

const KEYWORDS = ['gold', 'fed', 'cpi', 'inflation', 'interest', 'fomc', 'powell'];

const fs = require('fs');
const path = require('path');
const cacheFile = path.join(__dirname, 'last-news.json');

let lastPostedTitle = "";

// Load title saat startup
if (fs.existsSync(cacheFile)) {
  const json = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  lastPostedTitle = json.title || "";
}

// Load title on startup
if (fs.existsSync(cacheFile)) {
  const json = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  lastPostedTitle = json.title || '';
}

async function fetchDailyForexRSS() {
  try {
    console.log('🟡 fetchDailyForexRSS() triggered!');
    const { data } = await axios.get('https://www.dailyforex.com/rss/technicalanalysis.xml');
    const parsed = await xml2js.parseStringPromise(data);
    const items = parsed.rss.channel[0].item;
    if (!items || items.length === 0) return;

    const topItems = items.slice(0, 5); // you can increase if needed

    for (const item of topItems) {
      const title = item.title[0];
      const content = item.description[0];

      if (!title || title === lastPostedTitle) {
        console.log('⏭️ News already sent previously:', title);
        continue;
      }

      const isRelevant = KEYWORDS.some(keyword =>
        (title + content).toLowerCase().includes(keyword)
      );

      if (isRelevant) {
        await axios.post(WEBHOOK_URL, { title, content });

        // Simpan judul ke file agar tidak kirim ulang
        fs.writeFileSync(cacheFile, JSON.stringify({ title }), 'utf-8');
        lastPostedTitle = title;

        console.log('📬 News matched & sent to internal webhook:', title);
        break;
      }
    }
  } catch (err) {
    console.error('❌ RSS scrape error:', err.message);
  }
}

module.exports = { fetchDailyForexRSS };

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

      if (!title || title === lastPostedTitle) {
        console.log("⏭️ News already sent previously:", title);
        continue;
      }

      const isRelevant = KEYWORDS.some(keyword =>
        (title + content).toLowerCase().includes(keyword)
      );

      if (isRelevant) {
        await axios.post(WEBHOOK_URL, { title, content });

        // Simpan ke file
        fs.writeFileSync(cacheFile, JSON.stringify({ title }), 'utf-8');
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
2. Berikan penjelasan singkat dalam 2 poin.
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
function formatTelegramMessage(title, analysis, prediction, hargaEmas) {
  const waktu = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `📰 *Berita Penting Terdeteksi!*\n\n` +
         `📌 *Judul Berita:*\n${title}\n\n` +
         `🧠 *Analisa:*\n${cleanAnalysis(analysis)}\n\n` +
         `📊 *Prediksi Arah Harga Emas:*\n${prediction}\n\n` +
         `💰 *Harga Emas:* ${hargaEmas}\n\n` +
         `🕒 *Waktu:*\n${waktu}`;
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

    const market = await getMarketMetrics();
    const hargaEmas = market.currentPrice ? `\$${market.currentPrice} (update: ${market.updatedAt})` : 'Tidak tersedia';
    console.log("🧾 Metrics:", market);

    const message = formatTelegramMessage(title, analysis, prediction, hargaEmas);

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
