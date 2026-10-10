import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { feedUrl, feedName } = await req.json();

    if (!feedUrl) {
      return NextResponse.json({ error: 'Feed URL is required' }, { status: 400 });
    }

    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'ZeinityCreatorStudio/1.0 (RSS Newsroom Ingestion Reader)',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();

    // Regex-based lightweight XML item extraction
    const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const block = match[1] || match[2] || '';
      const titleMatch = block.match(/<title(?:[^>]*)>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["']|<link[^>]*>([\s\S]*?)<\/link>/i);
      const pubDateMatch = block.match(/<(?:pubDate|published|updated)>([\s\S]*?)<\/(?:pubDate|published|updated)>/i);
      const descMatch = block.match(/<(?:description|summary|content)>([\s\S]*?)<\/(?:description|summary|content)>/i);

      const clean = (s: string) =>
        s.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
         .replace(/<[^>]+>/g, '')
         .replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'")
         .trim();

      const title = clean(titleMatch ? titleMatch[1] : 'Untitled Signal');
      const link = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : feedUrl;
      const pubDate = clean(pubDateMatch ? pubDateMatch[1] : new Date().toISOString());
      const desc = clean(descMatch ? descMatch[1] : '').slice(0, 300);

      if (title) {
        items.push({ title, link, pubDate, description: desc });
      }
    }

    return NextResponse.json({
      ok: true,
      feedName: feedName || 'RSS Feed',
      count: items.length,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
