// ai-news-alert-bot/server.js (Telegram & ChatGPT Webhook Processor)

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { getMarketMetrics } = require('./metrics');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function analyzeWithChatGPT(newsText) {
  const prompt = `Summarize the following news into a short monetary policy tone (hawkish/dovish/neutral), and give 1-line prediction for gold price movement (bullish/bearish/neutral):\n\n"""${newsText}"""`;

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

function formatTelegramMessage(title, analysis, prediction, currentPrice) {
  return `📰 *High Impact News Triggered!*\n\n*Headline:* ${title}\n\n*Analysis:* ${analysis}\n\n*Prediction:* ${prediction}\n*Current Price:* $${currentPrice}`;
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
    const metrics = await getMarketMetrics();

    // Extract prediction (assumes last sentence is prediction)
    const split = analysis.split(/\n|\./);
    const prediction = split.pop().trim();
    const summary = split.join(". ").trim();

    const message = formatTelegramMessage(title, summary, prediction, metrics.currentPrice || 'N/A');
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
