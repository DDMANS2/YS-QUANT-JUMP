async function fetchNaverStockData(code: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://finance.naver.com/item/main.naver?code=${code}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);
    const html = await response.text();
    
    let currentPrice = null;
    const priceMatch = html.match(/<p class="no_today">\s*<em[^>]*>\s*<span class="blind">([\d,]+)<\/span>/);
    if (priceMatch && priceMatch[1]) {
      currentPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    }

    let per = null;
    const perMatch = html.match(/<em id="_per">([\d,.]+)<\/em>/);
    if (perMatch && perMatch[1]) {
      per = parseFloat(perMatch[1].replace(/,/g, ''));
    }

    let pbr = null;
    const pbrMatch = html.match(/<em id="_pbr">([\d,.]+)<\/em>/);
    if (pbrMatch && pbrMatch[1]) {
      pbr = parseFloat(pbrMatch[1].replace(/,/g, ''));
    }

    let roe = null;
    const roeMatch = html.match(/<th scope="row" class="h_th2 th_cop_anal13"><strong>ROE\\(지배주주\\)<\/strong><\/th>([\s\S]*?)<\/tr>/);
    if (roeMatch) {
      const tds = roeMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (tds && tds.length >= 4) {
        let roeStr = tds[3].replace(/<[^>]+>/g, '').trim();
        if (!roeStr || isNaN(parseFloat(roeStr))) {
          roeStr = tds[2].replace(/<[^>]+>/g, '').trim();
        }
        if (roeStr && !isNaN(parseFloat(roeStr))) {
          roe = parseFloat(roeStr);
        }
      }
    }

    return { currentPrice, per, pbr, roe };
  } catch (error) {
    console.error(`Failed to fetch data for ${code}:`, error instanceof Error ? error.message : error);
  }
  return { currentPrice: null, per: null, pbr: null, roe: null };
}

fetchNaverStockData('005930').then(console.log);
