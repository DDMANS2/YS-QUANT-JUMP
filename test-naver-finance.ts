async function test() {
  const res = await fetch('https://finance.naver.com/item/main.naver?code=005930');
  const html = await res.text();
  const lines = html.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('PER') || line.includes('PBR') || line.includes('ROE')) {
      console.log(`${i}: ${line.trim()}`);
    }
  });
}
test();
