// ai-news-alert-bot/index.js (RSS Scraper + Webhook Sender)

const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');
const TWELVE_API_KEY = process.env.TWELVE_API_KEY;
require('dotenv').config();

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const KEYWORDS = ['gold', 'fed', 'cpi', 'inflation', 'interest', 'fomc', 'powell'];
let lastPostedTitle = '';

async function fetchFXStreetRSS() {
  try {
    console.log("🟡 fetchFXStreetRSS() triggered!");

    const { data } = await axios.get('https://www.fxstreet.com/rss/news');
    const parsed = await xml2js.parseStringPromise(data);
    const items = parsed.rss.channel[0].item;

    if (!items || items.length === 0) {
      console.log("❌ No items found in RSS feed.");
      return;
    }

    const topItems = items.slice(0, 5); // top 5 articles

    for (const item of topItems) {
      const title = item.title[0];
      const content = item.description[0];

      console.log(`🔍 Title: ${title}`);
      console.log(`🔍 Content: ${content}`);

      if (!title || title === lastPostedTitle) continue;

      const isRelevant = KEYWORDS.some(keyword =>
        (title + content).toLowerCase().includes(keyword)
      );

      console.log(`📊 Keyword match: ${isRelevant}`);

      if (isRelevant) {
        await axios.post(WEBHOOK_URL, { title, content }).catch(err => {
          console.error("❌ Failed to send to webhook:", err.message);
        });
        lastPostedTitle = title;
        console.log("📬 News sent to Telegram webhook!");
        break;
      } else {
        console.log("❌ Not relevant, skipped.");
      }
    }
  } catch (err) {
    console.error('❌ Error scraping FXStreet RSS:', err.message);
  }
}

async function getMarketMetrics() {
  try {
    const baseUrl = "https://api.twelvedata.com";

    // Fetch MA
    const [ma50Res, ma200Res, rsiRes, dxyRes] = await Promise.all([
      axios.get(`${baseUrl}/ma?symbol=XAU/USD&interval=1h&time_period=50&apikey=${TWELVE_API_KEY}`),
      axios.get(`${baseUrl}/ma?symbol=XAU/USD&interval=1h&time_period=200&apikey=${TWELVE_API_KEY}`),
      axios.get(`${baseUrl}/rsi?symbol=XAU/USD&interval=1h&time_period=14&apikey=${TWELVE_API_KEY}`),
      axios.get(`${baseUrl}/quote?symbol=DXY&apikey=${TWELVE_API_KEY}`),
    ]);

    const ma50 = parseFloat(ma50Res.data.value);
    const ma200 = parseFloat(ma200Res.data.value);
    const rsi = parseFloat(rsiRes.data.value);
    const dxy = parseFloat(dxyRes.data.close);

    // USD Strength logic (basic)
    let usdStrength = "neutral";
    if (dxy > 105) usdStrength = "strong";
    else if (dxy < 103) usdStrength = "weak";

    return { ma50, ma200, rsi, usdStrength };
  } catch (err) {
    console.error("❌ Error fetching metrics:", err.message);
    return { ma50: null, ma200: null, rsi: null, usdStrength: "unknown" };
  }
}

cron.schedule('*/5 * * * *', fetchFXStreetRSS);
fetchFXStreetRSS();
console.log('🤖 RSS-based news alert bot is running...');
