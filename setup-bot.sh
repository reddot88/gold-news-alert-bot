#!/bin/bash

# === 1. Update system ===
echo "Updating system packages..."
apt update && apt upgrade -y

# === 2. Install Node.js (v18 LTS) ===
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# === 3. Install pm2 (for background process) ===
echo "Installing pm2..."
npm install -g pm2

# === 4. Clone your GitHub repo ===
echo "Cloning your bot repository..."
git clone https://github.com/reddot88/gold-news-alert-bot.git
cd gold-news-alert-bot

# === 5. Install dependencies ===
echo "Installing project dependencies..."
npm install

# === 6. Prompt user to add .env manually ===
echo "Please create your .env file now with your credentials:"
echo "TELEGRAM_TOKEN=..."
echo "TELEGRAM_CHAT_ID=..."
echo "OPENAI_API_KEY=..."
echo "WEBHOOK_URL=http://localhost:3000/news"
echo ""
echo "Opening nano editor..."
nano .env

# === 7. Start both bots with pm2 ===
echo "Starting server.js and index.js with pm2..."
pm2 start server.js --name telegram-server
pm2 start index.js --name news-scraper

# === 8. Enable pm2 startup ===
echo "Enabling pm2 auto-start on reboot..."
pm2 startup
pm2 save

# === DONE ===
echo "✅ Bot is deployed and running! Use 'pm2 logs' to monitor."
