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
const METALPRICE_API_KEY = process.env.METALPRICE_API_KEY;

// --- Helper to fetch gold price from MetalpriceAPI ---
async function getGoldPrice() {
  try {
    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${METALPRICE_API_KEY}&base=USD&currencies=XAU`;
    const response = await axios.get(url);
    const rate = response.data?.rates?.XAU;
    return rate ? 1 / rate : null;
  } catch (err) {
    console.error("❌ Failed to fetch gold price:", err.message);
    return null;
  }
}

// --- Helper to talk to ChatGPT ---
async function analyzeWithChatGPT(newsText) {
  const prompt = `Analyze the following news for its tone on monetary policy (hawkish/dovish/neutral) and its likely impact on gold prices (bullish/bearish/neutral):\n\n"""${newsText}"""\n\nRespond in this format:\nAnalysis: <Short analysis>\nPrediction: <Bullish/Bearish/Neutral>`;
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
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

// --- Format Telegram Message ---
function formatTelegramMessage(title, summary, prediction, currentPrice) {
  return `📰 *High Impact News Triggered!*\n
*Headline:* ${title}

*Analysis:* ${summary}

*Prediction:* Gold Price Movement Prediction: ${prediction}
*Current Price:* $${currentPrice ? currentPrice.toFixed(2) : 'N/A'}`;
}

// --- Telegram Sender ---
async function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
  });
}

// --- Webhook Endpoint ---
app.post('/news', async (req, res) => {
  try {
    const { title, content } = req.body;
    console.log(`📩 News received: ${title}`);

    const ai = await analyzeWithChatGPT(content);
    const lines = ai.split('\n').filter(Boolean);
    let summary = 'N/A';
    let prediction = 'N/A';
    
    for (const line of lines) {
      if (line.toLowerCase().includes('analysis')) {
        summary = line.replace(/.*analysis[:\-]?\s*/i, '').trim();
      }
      if (line.toLowerCase().includes('prediction')) {
        prediction = line.replace(/.*prediction[:\-]?\s*/i, '').trim();
      }
    }


    const currentPrice = await getGoldPrice();
    const msg = formatTelegramMessage(title, summary, prediction, currentPrice);

    await sendToTelegram(msg);
    res.status(200).send('✅ News alert sent');
  } catch (err) {
    console.error('❌ Error in /news endpoint:', err.message);
    res.status(500).send('Server error');
  }
});

app.get('/', (req, res) => {
  res.send('🚀 Gold Alert Bot is running');
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
