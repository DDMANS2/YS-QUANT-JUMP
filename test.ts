async function test() {
  const clientId = process.env.NAVER_CLIENT_ID || 'y_fbn7ZkpVDPmEDwMRzd';
  const clientSecret = process.env.NAVER_CLIENT_SECRET || 'apDex1ug4_';
  try {
    const keyword = '에코프로 주가';
    const res = await fetch(`https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(keyword)}&display=5`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    const data = await res.json();
    for (const item of data.items) {
      const match = item.title.match(/\b(\d{6})\b/) || item.description.match(/\b(\d{6})\b/) || item.link.match(/\b(\d{6})\b/);
      if (match) {
        console.log('Found code:', match[1]);
        return;
      }
    }
    console.log('Not found');
  } catch (e) {
    console.error(e);
  }
}
test();
