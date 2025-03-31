// ai-news-alert-bot/index.js (RSS Scraper + Webhook Sender with Duplicate Filter)

const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const KEYWORDS = ['gold', 'fed', 'cpi', 'inflation', 'interest', 'fomc', 'powell'];
const POSTED_FILE = './posted.json';
let postedTitles = [];

// Load posted titles from file (if exists)
if (fs.existsSync(POSTED_FILE)) {
  try {
    postedTitles = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to load posted titles:', err.message);
  }
}

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

      if (!title || postedTitles.includes(title)) {
        console.log("⚠️ Duplicate or empty title, skipped.");
        continue;
      }

      const isRelevant = KEYWORDS.some(keyword =>
        (title + content).toLowerCase().includes(keyword)
      );

      console.log(`📊 Keyword match: ${isRelevant}`);

      if (isRelevant) {
        await axios.post(WEBHOOK_URL, { title, content }).catch(err => {
          console.error("❌ Failed to send to webhook:", err.message);
        });
        postedTitles.push(title);
        fs.writeFileSync(POSTED_FILE, JSON.stringify(postedTitles, null, 2));
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

cron.schedule('*/5 * * * *', fetchFXStreetRSS);
fetchFXStreetRSS();
console.log('🤖 RSS-based news alert bot is running...');
