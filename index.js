// ai-news-alert-bot/index.js

const axios = require('axios');
const xml2js = require('xml2js');
const cron = require('node-cron');
require('dotenv').config();

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const KEYWORDS = ['gold', 'fed', 'cpi', 'inflation', 'interest', 'fomc', 'powell'];
const recentTitles = new Set(); // ✅ Track duplicates

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

    const topItems = items.slice(0, 5); // ✅ check top 5 only

    for (const item of topItems) {
      const title = item.title[0];
      const content = item.description[0];

      console.log(`🔍 Title: ${title}`);
      console.log(`🔍 Content: ${content}`);

      if (!title || recentTitles.has(title)) {
        console.log("⏩ Already processed, skipping...");
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

        recentTitles.add(title); // ✅ Add to memory
        if (recentTitles.size > 10) {
          const first = recentTitles.values().next().value;
          recentTitles.delete(first); // Keep it small
        }

        console.log("📬 News sent to Telegram webhook!");
        break; // ✅ Only send 1 relevant news per cycle
      } else {
        console.log("❌ Not relevant, skipped.");
      }
    }
  } catch (err) {
    console.error('❌ Error scraping FXStreet RSS:', err.message);
  }
}

// ⏱ Run every 5 minutes
cron.schedule('*/5 * * * *', fetchFXStreetRSS);
fetchFXStreetRSS();

console.log('🤖 RSS-based news alert bot is running...');
