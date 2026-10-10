import http from 'node:http';

async function testCss() {
  const res = await fetch('http://localhost:3000');
  const html = await res.text();
  const match = html.match(/href="([^"]+layout\.css[^"]*)"/);
  if (match) {
    const cssUrl = 'http://localhost:3000' + match[1];
    console.log('CSS URL:', cssUrl);
    const cssRes = await fetch(cssUrl);
    const css = await cssRes.text();
    console.log('CSS Status:', cssRes.status, 'Len:', css.length);
    console.log('Contains var(--line):', css.includes('var(--line)'));
    console.log('CSS Sample (first 300 chars):', css.slice(0, 300));
  } else {
    console.log('No CSS match found in HTML');
  }
}

testCss().catch(console.error);
