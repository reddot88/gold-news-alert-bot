const axios = require('axios');
const { sendToTelegram } = require('./services/telegram');
const ALPHA_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const SYMBOL = 'XAUUSD';
const INTERVAL = '60min';
const RSI_PERIOD = 14;

const MA_ZONE = {
  min: 3055,
  max: 3070,
};

// Convert to WIB (UTC+7)
function getWIBTime() {
  const now = new Date();
  const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return utc7.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
}

async function getAlphaData() {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${SYMBOL}&interval=${INTERVAL}&outputsize=compact&apikey=${ALPHA_KEY}`;
  const response = await axios.get(url);
  const data = response.data['Time Series (60min)'];
  const candles = Object.entries(data).map(([time, value]) => ({
    time,
    open: parseFloat(value['1. open']),
    high: parseFloat(value['2. high']),
    low: parseFloat(value['3. low']),
    close: parseFloat(value['4. close']),
  }));
  return candles.sort((a, b) => new Date(a.time) - new Date(b.time));
}

function calculateMA(data, period) {
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, c) => acc + c.close, 0);
  return sum / period;
}

function calculateRSI(data, period) {
  const closes = data.map(d => d.close);
  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length - 1; i++) {
    const diff = closes[i + 1] - closes[i];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return rsi;
}

function inPullbackZone(price) {
  return price >= MA_ZONE.min && price <= MA_ZONE.max;
}

function isBullishCandle(candle) {
  return candle.close > candle.open;
}

async function checkPullbackSignal() {
  try {
    const candles = await getAlphaData();
    const current = candles[candles.length - 1];
    const ma50 = calculateMA(candles, 50);
    const ma200 = calculateMA(candles, 200);
    const rsi = calculateRSI(candles, RSI_PERIOD);
    const wibTime = getWIBTime();

    if (
      inPullbackZone(current.close) &&
      rsi >= 50 && rsi <= 60 &&
      ma50 > ma200 &&
      isBullishCandle(current)
    ) {
      const msg = `**Gold Pullback Signal**
WIB Time: ${wibTime}
Price: $${current.close.toFixed(2)}
RSI: ${rsi.toFixed(2)}
MA50: ${ma50.toFixed(2)} > MA200: ${ma200.toFixed(2)}
Candle: Bullish ✅

Consider looking for BUY setups on confirmation.`;
      await sendTelegramMessage(msg);
      console.log('Pullback signal sent.');
    } else {
      const msg = `**No Pullback Signal**
WIB Time: ${wibTime}
Price: $${current.close.toFixed(2)}
RSI: ${rsi.toFixed(2)}
MA50: ${ma50.toFixed(2)}, MA200: ${ma200.toFixed(2)}
Candle: ${isBullishCandle(current) ? 'Bullish' : 'Not Bullish'}

Status: Market not in ideal buy zone yet.`;
      await sendTelegramMessage(msg);
      console.log('No signal — status update sent.');
    }
  } catch (err) {
    console.error('Error checking pullback:', err.message);
  }
}

module.exports = { checkPullbackSignal };
