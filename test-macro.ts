import YahooFinance from 'yahoo-finance2';

async function test() {
  try {
    const yf = new YahooFinance();
    const symbols = ['KRW=X', 'CL=F', '^TNX', '^VIX'];
    for (const symbol of symbols) {
      const quote = await yf.quote(symbol);
      console.log(`${symbol}: ${quote.regularMarketPrice} (change: ${quote.regularMarketChange}, ${quote.regularMarketChangePercent}%)`);
    }
  } catch (e) {
    console.error(e);
  }
}
test();
