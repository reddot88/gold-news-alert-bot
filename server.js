// server.js (Telegram + ChatGPT Webhook Processor)
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
  const prompt = `Analyze the following news for its tone on monetary policy (hawkish/dovish/neutral) and how it might affect gold prices. Then summarize the tone and give a prediction for gold price movement (Bullish, Bearish, Neutral).\n\nNews:\n"""${newsText}"""\n\nRespond in this format:\nTone: <hawkish/dovish/neutral>\nPrediction: <Bullish/Bearish/Neutral>`;

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

function formatTelegramMessage(title, analysis, prediction, price) {
  return `🗞 *High Impact News Triggered!*\n\n*Headline:* ${title}\n\n*Analysis:* Monetary Policy Tone: ${analysis}\n\n*Prediction:* Gold Price Movement Prediction: ${prediction}\n*Current Price:* $${price ? price.toFixed(2) : 'N/A'}`;
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

    const analysisText = await analyzeWithChatGPT(content);
    const [toneLine, predictionLine] = analysisText.split('\n');
    const tone = toneLine?.split(':')[1]?.trim() || 'N/A';
    const prediction = predictionLine?.split(':')[1]?.trim() || 'N/A';

    const metrics = await getMarketMetrics();
    const price = metrics.currentPrice;

    const message = formatTelegramMessage(title, tone, prediction, price);
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
