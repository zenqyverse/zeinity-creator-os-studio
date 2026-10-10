async function checkScripts() {
  const res = await fetch('http://localhost:3000');
  const text = await res.text();
  const scriptTags = text.match(/src="([^"]+)"/g);
  if (!scriptTags) {
    console.log('No script tags found');
    return;
  }
  const urls = scriptTags.map(s => s.replace(/^src="/, '').replace(/"$/, ''));
  for (const url of urls) {
    const fullUrl = url.startsWith('http') ? url : 'http://localhost:3000' + url;
    try {
      const r = await fetch(fullUrl);
      const code = await r.text();
      console.log(url, 'status:', r.status, 'bytes:', code.length);
      new Function(code);
      console.log('  -> SYNTAX OK');
    } catch (err) {
      console.error(url, '  -> ERROR:', err.message);
    }
  }
}

checkScripts().catch(console.error);
