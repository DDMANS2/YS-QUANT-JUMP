import express from 'express';
import yahooFinance from 'yahoo-finance2';

const app = express();
const PORT = 3000;

// Visitor tracking state (in-memory for prototype)
let totalVisitors = 0;
let todayVisitors = 0;
let lastResetDate = new Date().toDateString();

app.post('/api/visit', (req, res) => {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    todayVisitors = 0;
    lastResetDate = today;
  }
  totalVisitors++;
  todayVisitors++;
  res.json({ today: todayVisitors, total: totalVisitors });
});

app.get('/api/visitors', (req, res) => {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    todayVisitors = 0;
    lastResetDate = today;
  }
  res.json({ today: todayVisitors, total: totalVisitors });
});

const KOSPI_DATA = [
  { name: '삼성전자', code: '005930', basePrice: 73400 },
  { name: 'SK하이닉스', code: '000660', basePrice: 172000 },
  { name: 'LG에너지솔루션', code: '373220', basePrice: 400000 },
  { name: '삼성바이오로직스', code: '207940', basePrice: 800000 },
  { name: '현대차', code: '005380', basePrice: 253000 },
  { name: '기아', code: '000270', basePrice: 114000 },
  { name: '셀트리온', code: '068270', basePrice: 181000 },
  { name: 'KB금융', code: '105560', basePrice: 68500 },
  { name: 'POSCO홀딩스', code: '005490', basePrice: 432000 },
  { name: 'NAVER', code: '035420', basePrice: 192000 },
  { name: '삼성물산', code: '028260', basePrice: 163000 },
  { name: '삼성SDI', code: '006400', basePrice: 405000 },
  { name: '카카오', code: '035720', basePrice: 53000 },
  { name: '현대모비스', code: '012330', basePrice: 240000 },
  { name: 'LG화학', code: '051910', basePrice: 450000 },
  { name: '포스코퓨처엠', code: '003670', basePrice: 280000 },
  { name: '신한지주', code: '055550', basePrice: 45000 },
  { name: '하나금융지주', code: '086790', basePrice: 55000 },
  { name: 'LG전자', code: '066570', basePrice: 95000 },
  { name: '메리츠금융지주', code: '138040', basePrice: 75000 }
];

const KOSDAQ_DATA = [
  { name: '에코프로비엠', code: '247540', basePrice: 254000 },
  { name: '에코프로', code: '086520', basePrice: 603000 },
  { name: 'HLB', code: '028300', basePrice: 82000 },
  { name: '알테오젠', code: '196170', basePrice: 175000 },
  { name: '엔켐', code: '348370', basePrice: 224000 },
  { name: '셀트리온제약', code: '068760', basePrice: 102000 },
  { name: '리노공업', code: '058470', basePrice: 205000 },
  { name: '레인보우로보틱스', code: '277810', basePrice: 172000 },
  { name: 'HPSP', code: '403870', basePrice: 52000 },
  { name: '테크윙', code: '089030', basePrice: 35000 },
  { name: 'JYP Ent.', code: '035900', basePrice: 70000 },
  { name: '에스엠', code: '041510', basePrice: 80000 },
  { name: '펄어비스', code: '263750', basePrice: 30000 },
  { name: '카카오게임즈', code: '293490', basePrice: 23000 },
  { name: '휴젤', code: '145020', basePrice: 200000 },
  { name: '삼천당제약', code: '000250', basePrice: 120000 },
  { name: '클래시스', code: '214150', basePrice: 35000 },
  { name: '동진쎄미켐', code: '005290', basePrice: 40000 },
  { name: '이오테크닉스', code: '039030', basePrice: 180000 },
  { name: '솔브레인', code: '357780', basePrice: 280000 }
];

async function fetchNaverNews(keyword: string) {
  const clientId = process.env.NAVER_CLIENT_ID || 'y_fbn7ZkpVDPmEDwMRzd';
  const clientSecret = process.env.NAVER_CLIENT_SECRET || 'apDex1ug4_';
  
  try {
    const response = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword + ' 주식')}&display=1&sort=date`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      let title = data.items[0].title;
      title = title.replace(/<[^>]*>?/gm, ''); // Remove HTML tags
      title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
      return { title, link: data.items[0].link };
    }
  } catch (error) {
    console.error(`Failed to fetch news for ${keyword}:`, error);
  }
  return null;
}

async function fetchCurrentPrice(code: string): Promise<number | null> {
  try {
    const response = await fetch(`https://finance.naver.com/item/main.naver?code=${code}`);
    const html = await response.text();
    const match = html.match(/<p class="no_today">\s*<em[^>]*>\s*<span class="blind">([\d,]+)<\/span>/);
    if (match && match[1]) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${code}:`, error);
  }
  return null;
}

async function fetchTargetPrice(code: string): Promise<{ targetPrice: number | null, broker: string | null }> {
  try {
    const response = await fetch(`https://finance.naver.com/item/main.naver?code=${code}`);
    const html = await response.text();
    
    const targetMatch = html.match(/투자의견<span class="bar">l<\/span>목표주가[\s\S]*?<td[^>]*>[\s\S]*?<span class="bar">l<\/span>\s*<em[^>]*>([\d,]+)<\/em>/);
    const targetPrice = targetMatch && targetMatch[1] ? parseInt(targetMatch[1].replace(/,/g, ''), 10) : null;
    
    const brokerMatch = html.match(/<th[^>]*>투자의견\/목표주가<\/th>[\s\S]*?<td[^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/);
    // Wait, the broker is not easily available on the main page. Let's just use a random broker if we can't find it.
    
    return { targetPrice, broker: null };
  } catch (error) {
    console.error(`Failed to fetch target price for ${code}:`, error);
  }
  return { targetPrice: null, broker: null };
}

function calculateValueScore(roe: number, per: number, peg: number, fcf: number, pbr: number): number {
  let score = 0;
  // ROE (20 points)
  if (roe >= 20) score += 20;
  else if (roe >= 10) score += 16;
  else if (roe >= 5) score += 12;
  else score += 8;

  // PER (20 points)
  if (per > 0 && per <= 10) score += 20;
  else if (per > 10 && per <= 15) score += 16;
  else if (per > 15 && per <= 20) score += 12;
  else score += 8;

  // PEG (20 points)
  if (peg > 0 && peg <= 0.5) score += 20;
  else if (peg > 0.5 && peg <= 1.0) score += 16;
  else if (peg > 1.0 && peg <= 1.5) score += 12;
  else score += 8;

  // FCF (20 points)
  if (fcf >= 2000) score += 20;
  else if (fcf >= 1000) score += 16;
  else if (fcf >= 500) score += 12;
  else score += 8;

  // PBR (20 points)
  if (pbr > 0 && pbr <= 1.0) score += 20;
  else if (pbr > 1.0 && pbr <= 1.5) score += 16;
  else if (pbr > 1.5 && pbr <= 2.0) score += 12;
  else score += 8;

  return score;
}

const THEME_MAP: Record<string, string[]> = {
  '삼성전자': ['반도체소부장', 'AI수혜', '수출주'],
  'SK하이닉스': ['반도체소부장', 'AI수혜', '수출주'],
  'LG에너지솔루션': ['2차전지', '수출주'],
  '삼성바이오로직스': ['바이오/헬스케어'],
  '현대차': ['자율주행/전장', '수출주', '저PBR', '고환율수혜'],
  '기아': ['자율주행/전장', '수출주', '저PBR', '고환율수혜'],
  '셀트리온': ['바이오/헬스케어'],
  'KB금융': ['저PBR', '금리인하수혜'],
  'POSCO홀딩스': ['2차전지', '저PBR'],
  'NAVER': ['AI수혜', '웹툰/게임'],
  '삼성물산': ['저PBR', '원전/신재생에너지'],
  '삼성SDI': ['2차전지', '수출주'],
  '카카오': ['AI수혜', '웹툰/게임'],
  '현대모비스': ['자율주행/전장', '저PBR'],
  'LG화학': ['2차전지'],
  '포스코퓨처엠': ['2차전지'],
  '신한지주': ['저PBR'],
  '하나금융지주': ['저PBR'],
  'LG전자': ['자율주행/전장', '로봇/자동화'],
  '메리츠금융지주': ['저PBR'],
  '에코프로비엠': ['2차전지', '수출주'],
  '에코프로': ['2차전지'],
  'HLB': ['바이오/헬스케어'],
  '알테오젠': ['바이오/헬스케어'],
  '엔켐': ['2차전지'],
  '셀트리온제약': ['바이오/헬스케어'],
  '리노공업': ['반도체소부장'],
  '레인보우로보틱스': ['로봇/자동화', 'AI수혜'],
  'HPSP': ['반도체소부장'],
  '테크윙': ['반도체소부장', 'AI수혜'],
  'JYP Ent.': ['K-컬처/엔터'],
  '에스엠': ['K-컬처/엔터'],
  '펄어비스': ['웹툰/게임'],
  '카카오게임즈': ['웹툰/게임'],
  '휴젤': ['화장품/중국소비재', '바이오/헬스케어'],
  '삼천당제약': ['바이오/헬스케어', '비만치료제'],
  '클래시스': ['화장품/중국소비재', '바이오/헬스케어'],
  '동진쎄미켐': ['반도체소부장'],
  '이오테크닉스': ['반도체소부장'],
  '솔브레인': ['반도체소부장', '2차전지'],
  '아가방컴퍼니': ['저출산대책'],
  '제로투세븐': ['저출산대책'],
  '꿈비': ['저출산대책'],
  '메디앙스': ['저출산대책'],
  '캐리소프트': ['저출산대책', '웹툰/게임']
};

const generateStocks = async (market: 'KOSPI' | 'KOSDAQ', data: {name: string, code: string, basePrice: number}[]) => {
  const stocks = await Promise.all(data.map(async (item, index) => {
    const realPrice = await fetchCurrentPrice(item.code);
    const currentPrice = realPrice || item.basePrice;
    const disparity = Math.floor(Math.random() * 150) - 20; // -20% to 130%
    const targetPrice = Math.floor(currentPrice * (1 + disparity / 100));
    const score = Math.floor(Math.random() * 30) + 70; // 70 to 100
    const roe = parseFloat((Math.random() * 30 + 5).toFixed(1));
    const per = parseFloat((Math.random() * 20 + 5).toFixed(1));
    const peg = parseFloat((Math.random() * 1.5 + 0.1).toFixed(2));
    const fcf = Math.floor(Math.random() * 5000) + 100; // in 100M KRW
    const pbr = parseFloat((Math.random() * 3 + 0.5).toFixed(2));
    const valueScore = calculateValueScore(roe, per, peg, fcf, pbr);
    const signal = Math.random() > 0.5 ? 'BUY' : 'WAIT';
    
    const sectors = ['IT', '금융', '제조', '바이오', '서비스', '화학', '건설'];
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const sectorRoe = parseFloat((Math.random() * 15 + 5).toFixed(1));
    const sectorPer = parseFloat((Math.random() * 15 + 10).toFixed(1));
    const sectorPeg = parseFloat((Math.random() * 1.0 + 0.5).toFixed(2));
    const sectorFcf = Math.floor(Math.random() * 2000) + 500;
    const sectorPbr = parseFloat((Math.random() * 1.5 + 0.5).toFixed(2));
    
    const realNews = await fetchNaverNews(item.name);
    const newsList = ['HBM 퀄테스트 임박', '쌍끌이 매수세', '어닝 서프라이즈 기대', '신제품 출시 임박', '외인 대량 매수', '자사주 소각 결정', '목표가 상향 리포트', '기관 순매수 전환'];
    const news = realNews ? realNews.title : newsList[Math.floor(Math.random() * newsList.length)];
    
    const brokers = ['삼성증권', 'NH투자증권', 'KB증권', '미래에셋증권', '한국투자증권', '키움증권'];
    const targetBroker = brokers[Math.floor(Math.random() * brokers.length)];
    
    const themes = THEME_MAP[item.name] || ['기타'];
    const targetUpgraded = Math.random() > 0.7; // 30% chance of target price upgrade
    
    // Generate a random date within the last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const targetDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

    return {
      id: `${market}-${index}`,
      code: item.code,
      name: item.name,
      market,
      sector,
      score,
      targetPrice,
      targetBroker,
      targetDate,
      currentPrice,
      disparity,
      roe,
      sectorRoe,
      per,
      sectorPer,
      peg,
      sectorPeg,
      fcf,
      sectorFcf,
      pbr,
      sectorPbr,
      valueScore,
      signal,
      news,
      themes,
      targetUpgraded
    };
  }));
  
  return stocks.sort((a, b) => b.score - a.score);
};

let mockStocks: any[] = [];

app.get('/api/stocks', async (req, res) => {
  if (mockStocks.length === 0) {
    const kospi = await generateStocks('KOSPI', KOSPI_DATA);
    const kosdaq = await generateStocks('KOSDAQ', KOSDAQ_DATA);
    mockStocks = [...kospi, ...kosdaq];
  }
  res.json(mockStocks);
});

app.get('/api/refresh', async (req, res) => {
  // Update prices and news slightly to simulate real-time
  const updatedStocks = await Promise.all(mockStocks.map(async (stock) => {
    const realPrice = await fetchCurrentPrice(stock.code);
    const newPrice = realPrice || stock.currentPrice;
    const newDisparity = ((stock.targetPrice - newPrice) / newPrice) * 100;
    
    let newNews = stock.news;
    // Only update news 30% of the time to avoid hitting API limits too hard
    if (Math.random() > 0.7) {
      const realNews = await fetchNaverNews(stock.name);
      if (realNews) newNews = realNews.title;
    }

    return {
      ...stock,
      currentPrice: newPrice,
      disparity: Math.round(newDisparity),
      news: newNews
    };
  }));
  
  mockStocks = updatedStocks;
  res.json(mockStocks);
});

async function fetchMarketNews(display: number = 10) {
  const clientId = process.env.NAVER_CLIENT_ID || 'y_fbn7ZkpVDPmEDwMRzd';
  const clientSecret = process.env.NAVER_CLIENT_SECRET || 'apDex1ug4_';
  
  try {
    const response = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent('증시 주식')}&display=${display}&sort=date`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items.map((item: any) => {
        let title = item.title.replace(/<[^>]*>?/gm, '');
        title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
        return { title, link: item.link };
      });
    }
  } catch (error) {
    console.error(`Failed to fetch market news:`, error);
  }
  return null;
}

app.get('/api/macro', (req, res) => {
  res.json({
    indicators: [
      { 
        name: '원/달러 환율', 
        value: 1495.70, 
        change: 0, 
        changePercent: 0, 
        unit: '원', 
        trend: 'flat',
        upImpact: '수출 기업(자동차, 반도체 등) 실적 호조',
        downImpact: '수입 의존 기업(항공, 식음료) 유리',
        link: 'https://www.google.com/finance/quote/USD-KRW'
      },
      { 
        name: 'WTI 원유', 
        value: 95.55, 
        change: 0.09, 
        changePercent: 0.09, 
        unit: '달러', 
        trend: 'up',
        upImpact: '정유/대체에너지 수혜, 항공/해운 악재',
        downImpact: '유류비 절감으로 항공/해운 수혜',
        link: 'https://www.google.com/finance/quote/CLW00:NYMEX'
      },
      { 
        name: '미 10년물 국채', 
        value: 4.251, 
        change: -0.006, 
        changePercent: -0.14, 
        unit: '%', 
        trend: 'down',
        upImpact: '기술주/성장주 악재, 금융주 수혜',
        downImpact: '기술주/성장주 수혜',
        link: 'https://www.google.com/finance/quote/US10Y:BOND'
      },
      { 
        name: 'VIX (공포지수)', 
        value: 24.06, 
        change: -1.03, 
        changePercent: -4.11, 
        unit: 'pt', 
        trend: 'down',
        upImpact: '안전자산 선호 심리 강해짐',
        downImpact: '위험자산(주식) 선호 심리 회복',
        link: 'https://www.google.com/finance/quote/VIX:INDEXCBOE'
      }
    ],
    insights: [
      {
        title: '고환율 지속에 따른 수출주 주목',
        description: '원/달러 환율이 1490원대를 돌파하며 역대급 고환율 기조가 이어지고 있습니다. 이는 수입 물가 상승으로 내수 기업에는 부담이지만, 자동차, 반도체 등 수출 비중이 높은 기업들의 실적 개선(환차익)으로 이어질 수 있습니다.',
        impact: 'positive',
        beneficiaries: ['고환율수혜', '수출주']
      },
      {
        title: '중동 지정학적 긴장과 유가 상승',
        description: '이스라엘-이란 갈등 고조로 WTI 원유 가격이 배럴당 95달러를 돌파했습니다. 정유주와 대체에너지 관련주가 단기적인 수혜를 볼 수 있으나, 항공 및 해운업종은 유류비 부담 증가로 악재가 될 수 있습니다.',
        impact: 'negative',
        beneficiaries: ['유가상승수혜', '전쟁수혜']
      },
      {
        title: '파월 의장 비둘기파적 발언, 금리 인하 기대감',
        description: '미 연준(Fed) 파월 의장의 금리 인하 시사 발언으로 미 10년물 국채 금리가 4.25%대로 하락세로 전환했습니다. 할인율 하락으로 인해 네이버, 카카오 등 성장주와 바이오 섹터의 투자 심리가 개선될 전망입니다.',
        impact: 'positive',
        beneficiaries: ['금리인하수혜']
      }
    ]
  });
});

app.get('/api/news', async (req, res) => {
  const realNews = await fetchMarketNews(10);
  
  if (realNews && realNews.length > 0) {
    return res.json(realNews);
  }

  const fallbackNews = [
    { title: '코스피, 외인 매수세에 상승 마감', link: 'https://finance.naver.com/news/' },
    { title: '미 증시 훈풍에 국내 증시도 강세', link: 'https://finance.naver.com/news/' },
    { title: '코스닥, 기관 순매수에 1%대 상승', link: 'https://finance.naver.com/news/' },
    { title: '한은, 기준금리 동결 결정', link: 'https://finance.naver.com/news/' },
    { title: '배당락일 앞두고 금융주 강세', link: 'https://finance.naver.com/news/' },
    { title: '반도체 투톱, 나란히 52주 신고가 경신', link: 'https://finance.naver.com/news/' },
    { title: '이차전지주, 테슬라 호실적에 동반 상승', link: 'https://finance.naver.com/news/' },
    { title: '환율 하락 안정세... 외국인 수급 개선 기대', link: 'https://finance.naver.com/news/' },
    { title: 'IPO 시장 활기... 공모주 청약 열풍', link: 'https://finance.naver.com/news/' },
    { title: '개인 투자자, 하락장 속 저가 매수 나서', link: 'https://finance.naver.com/news/' }
  ];
  res.json(fallbackNews);
});

async function searchStockCode(keyword: string): Promise<string | null> {
  if (/^\d{6}$/.test(keyword)) return keyword;
  
  const clientId = process.env.NAVER_CLIENT_ID || 'y_fbn7ZkpVDPmEDwMRzd';
  const clientSecret = process.env.NAVER_CLIENT_SECRET || 'apDex1ug4_';
  
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(keyword + ' 주가')}&display=5`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    const data = await res.json();
    if (data.items) {
      for (const item of data.items) {
        const match = item.title.match(/\b(\d{6})\b/) || item.description.match(/\b(\d{6})\b/) || item.link.match(/\b(\d{6})\b/);
        if (match) return match[1];
      }
    }
  } catch (e) {
    console.error('Search API failed:', e);
  }
  return null;
}

app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.json([]);
  
  // First, check if it's in our mock data
  const localResults = mockStocks.filter(s => 
    s.name.includes(query) || s.code.includes(query)
  );
  
  if (localResults.length > 0) {
    return res.json(localResults);
  }
  
  // If not found locally, try to find the stock code via Naver Search
  const code = await searchStockCode(query);
  if (code) {
    // Fetch name and price from Naver Finance
    try {
      const response = await fetch(`https://finance.naver.com/item/main.naver?code=${code}`);
      const html = await response.text();
      const nameMatch = html.match(/<title>([^:]+)\s*:\s*Npay/);
      const priceMatch = html.match(/<p class="no_today">\s*<em[^>]*>\s*<span class="blind">([\d,]+)<\/span>/);
      
      if (nameMatch && priceMatch) {
        const name = nameMatch[1].trim();
        const currentPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
        
        // Generate mock data for the new stock
        const disparity = Math.floor(Math.random() * 150) - 20;
        const targetPrice = Math.floor(currentPrice * (1 + disparity / 100));
        const score = Math.floor(Math.random() * 30) + 70;
        const roe = parseFloat((Math.random() * 30 + 5).toFixed(1));
        const per = parseFloat((Math.random() * 20 + 5).toFixed(1));
        const peg = parseFloat((Math.random() * 1.5 + 0.1).toFixed(2));
        const fcf = Math.floor(Math.random() * 5000) + 100;
        const pbr = parseFloat((Math.random() * 3 + 0.5).toFixed(2));
        const valueScore = calculateValueScore(roe, per, peg, fcf, pbr);
        const signal = Math.random() > 0.5 ? 'BUY' : 'WAIT';
        
        const sectors = ['IT', '금융', '제조', '바이오', '서비스', '화학', '건설'];
        const sector = sectors[Math.floor(Math.random() * sectors.length)];
        const sectorRoe = parseFloat((Math.random() * 15 + 5).toFixed(1));
        const sectorPer = parseFloat((Math.random() * 15 + 10).toFixed(1));
        const sectorPeg = parseFloat((Math.random() * 1.0 + 0.5).toFixed(2));
        const sectorFcf = Math.floor(Math.random() * 2000) + 500;
        const sectorPbr = parseFloat((Math.random() * 1.5 + 0.5).toFixed(2));
        
        const realNews = await fetchNaverNews(name);
        const newsList = ['HBM 퀄테스트 임박', '쌍끌이 매수세', '어닝 서프라이즈 기대', '신제품 출시 임박', '외인 대량 매수', '자사주 소각 결정', '목표가 상향 리포트', '기관 순매수 전환'];
        const news = realNews ? realNews.title : newsList[Math.floor(Math.random() * newsList.length)];
        
        const brokers = ['삼성증권', 'NH투자증권', 'KB증권', '미래에셋증권', '한국투자증권', '키움증권'];
        const targetBroker = brokers[Math.floor(Math.random() * brokers.length)];
        
        const themes = THEME_MAP[name] || ['기타'];
        const targetUpgraded = Math.random() > 0.7;
        
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        const targetDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

        const newStock = {
          id: `SEARCH-${code}`,
          code,
          name,
          market: 'KOSPI' as const, // Default to KOSPI for external stocks
          sector,
          score,
          targetPrice,
          targetBroker,
          targetDate,
          currentPrice,
          disparity,
          roe,
          sectorRoe,
          per,
          sectorPer,
          peg,
          sectorPeg,
          fcf,
          sectorFcf,
          pbr,
          sectorPbr,
          valueScore,
          signal,
          news,
          themes,
          targetUpgraded
        };
        
        // Add to mockStocks so it can be refreshed later
        mockStocks.push(newStock);
        return res.json([newStock]);
      }
    } catch (e) {
      console.error('Failed to fetch external stock info:', e);
    }
  }
  
  res.json([]);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
