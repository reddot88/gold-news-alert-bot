// ai-news-alert-bot/server.js (Telegram & ChatGPT Webhook Processor)

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function analyzeWithChatGPT(newsText) {
  const prompt = `Analyze the following news for its tone on monetary policy (hawkish/dovish/neutral) and how it might affect gold prices:\n\"\"\"${newsText}\"\"\"\nThen summarize in 2–3 bullet points.`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content.trim();
}

async function getMarketMetrics() {
  const metrics = await getMarketMetrics();
  
  console.log("MA50:", metrics.ma50);
  console.log("RSI:", metrics.rsi);
  console.log("USD Strength:", metrics.usdStrength);

}

function formatTelegramMessage(title, analysis, mas) {
  const structure = mas.currentPrice > mas.ma50 && mas.currentPrice > mas.ma200
    ? '📈 Above both MAs (bullish)'
    : '📉 Below or between MAs';

  return `📰 *High Impact News Triggered!*\n\n*Headline:* ${title}\n\n*Analysis:*\n${analysis}\n\n*MA Levels (XAU/USD):*\n- 50 MA: $${mas.ma50}\n- 200 MA: $${mas.ma200}\n- Current Price: $${mas.currentPrice}\n- Structure: ${structure}`;
}

async function sendToTelegram(message) {
  const telegramURL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(telegramURL, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
  });
}

app.post('/news', async (req, res) => {
  try {
    const { title, content } = req.body;
    console.log(`📥 News received: ${title}`);

    const analysis = await analyzeWithChatGPT(content);
    const mas = await getMovingAverages();
    const message = formatTelegramMessage(title, analysis, mas);

    await sendToTelegram(message);
    console.log("📬 Sent to Telegram");
    res.status(200).send('✅ Alert processed and sent to Telegram');
  } catch (err) {
    console.error('❌ Error processing /news alert:', err.message);
    res.status(500).send('Error processing alert');
  }
});

app.get('/', (req, res) => {
  res.send('🚀 Gold Alert Webhook is running!');
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
