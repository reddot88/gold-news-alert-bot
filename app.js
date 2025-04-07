// ai-news-alert-bot/app.js (Combined Server + Scraper)

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');
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
  const prompt = `Analyze the following news for its tone on monetary policy (hawkish/dovish/neutral) and how it might affect gold prices:\n\"\"\"${newsText}\"\"\"\nThen summarize in 2–3 bullet points.`;
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  }, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
  });
  return response.data.choices[0].message.content.trim();
}

// Dummy MA
async function getMovingAverages() {
  return { ma50: 3005, ma200: 2960, currentPrice: 3020 };
}

// Format Telegram Message
function formatTelegramMessage(title, analysis, mas) {
  const structure = mas.currentPrice > mas.ma50 && mas.currentPrice > mas.ma200 ? '📈 Above both MAs (bullish)' : '📉 Below or between MAs';
  return `📰 *High Impact News Triggered!*\n\n*Headline:* ${title}\n\n*Analysis:*\n${analysis}\n\n*MA Levels (XAU/USD):*\n- 50 MA: $${mas.ma50}\n- 200 MA: $${mas.ma200}\n- Current Price: $${mas.currentPrice}\n- Structure: ${structure}`;
}

// Send to Telegram
async function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  });
}

// Webhook Endpoint
app.post('/news', async (req, res) => {
  try {
    const { title, content } = req.body;
    console.log(`📥 News received: ${title}`);

    const analysis = await analyzeWithChatGPT(content);
    const mas = await getMovingAverages();
    const message = formatTelegramMessage(title, analysis, mas);

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
