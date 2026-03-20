import fs from 'fs';

const html = fs.readFileSync('naver.html', 'utf-8');

const match = html.match(/증권사[\s\S]{0,500}/g);
console.log("Match:", match ? match.slice(0, 2) : null);
