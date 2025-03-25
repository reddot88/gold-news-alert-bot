# AI News Alert Bot for Gold (XAU/USD)

This project is an automated trading assistant that:
- Scrapes high-impact financial news from FXStreet RSS
- Filters for gold-relevant events using keywords
- Analyzes the news sentiment using ChatGPT
- Adds 50 & 200 MA structure
- Sends a summarized alert to your Telegram

---

## Features
- **News Source**: FXStreet RSS feed
- **AI Analysis**: OpenAI GPT-4 sentiment summary
- **Chart Context**: 50 & 200 MA structure
- **Delivery**: Telegram alert
- **Hosting**: Fully deployable to Railway

---

## Environment Variables (`.env`)

```
TELEGRAM_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
OPENAI_API_KEY=your_openai_key
WEBHOOK_URL=https://your-railway-url.up.railway.app/news
```

> You can get your Telegram `chat_id` by messaging [@userinfobot](https://t.me/userinfobot)

---

## File Structure

```
📦 ai-news-alert-bot
├── index.js          # Scraper (runs every 5 mins)
├── server.js         # Receives news and sends to Telegram
├── .env              # Your secrets
├── Procfile          # Tells Railway how to run
└── README.md         # You're reading it!
```

---

## Credits
- Built with [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [axios](https://www.npmjs.com/package/axios), and [xml2js](https://www.npmjs.com/package/xml2js)
- News by [FXStreet](https://www.fxstreet.com/)
- AI by [OpenAI GPT-4](https://platform.openai.com/)

---

## License
MIT
