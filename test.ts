import iconv from 'iconv-lite';
async function test() {
  const keyword = iconv.encode('상향', 'euc-kr').toString('hex').replace(/(..)/g, '%$1');
  const url = `https://finance.naver.com/research/company_list.naver?keyword=${keyword}&brokerCode=&searchType=title`;
  console.log(url);
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const html = iconv.decode(Buffer.from(buffer), 'euc-kr');
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/g);
  if(rows) {
      for(let i=0; i<Math.min(10, rows.length); i++) {
        const tr = rows[i];
        if (tr.includes('stock_item')) {
           const codeMatch = tr.match(/code=(\d{6})/);
           const nameMatch = tr.match(/title="([^"]+)"/);
           const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
           if (codeMatch && nameMatch && tdMatches && tdMatches.length >= 5) {
                const code = codeMatch[1];
                const name = nameMatch[1];
                const title = tdMatches[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
                const broker = tdMatches[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
                const date = tdMatches[4].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
                console.log({code, name, title, broker, date});
           }
        }
      }
  }
}
test();
