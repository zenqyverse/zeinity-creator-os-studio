import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${res.status}` }, { status: res.status });
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    
    // Attempt to extract publication date
    const publishedTime = $('meta[property="article:published_time"]').attr('content') 
      || $('meta[name="pubdate"]').attr('content')
      || $('time').attr('datetime')
      || '';

    let domain = '';
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace(/^www\./, '');
    } catch {}

    // Clean text extraction (paragraphs mainly)
    const textContent = $('p').map((i, el) => $(el).text().trim()).get().filter(t => t.length > 20).join('\n\n');

    return NextResponse.json({
      title,
      domain,
      publishedTime,
      textContent: textContent.substring(0, 5000), // Limit length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scraping failed' }, { status: 500 });
  }
}
