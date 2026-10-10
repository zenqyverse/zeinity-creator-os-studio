import { NextResponse } from 'next/server';

interface YouTubeTrendItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  author?: string;
  videoId?: string;
}

const FALLBACK_YOUTUBE_TRENDS: YouTubeTrendItem[] = [
  {
    title: 'Fitur Rahasia Ponsel Android 15 Yang Jarang Diketahui!',
    link: 'https://www.youtube.com/results?search_query=fitur+rahasia+android+shorts',
    pubDate: new Date().toISOString(),
    description: 'Format Quick Breakdown: Menampilkan demonstrasi menu developer dan optimasi baterai dalam durasi 40 detik.',
    author: 'Tech Creator Indo',
    videoId: 'yt-demo-01',
  },
  {
    title: 'Perbedaan Layar OLED vs AMOLED: Mana Yang Paling Aman Buat Mata?',
    link: 'https://www.youtube.com/results?search_query=oled+vs+amoled+shorts',
    pubDate: new Date().toISOString(),
    description: 'Format Myth Buster: Eksperimen modulasi PWM dan dampaknya terhadap kelelahan mata penonton digital.',
    author: 'Gadget Insider',
    videoId: 'yt-demo-02',
  },
  {
    title: 'Awas Modus Scam APK Undangan Pernikahan Versi Terbaru 2026',
    link: 'https://www.youtube.com/results?search_query=modus+apk+penipuan+shorts',
    pubDate: new Date().toISOString(),
    description: 'Format Flash News: Peringatan bahaya malware perbankan yang menyusup lewat pesan instan tanpa izin akses jelas.',
    author: 'Cyber Security ID',
    videoId: 'yt-demo-03',
  },
  {
    title: 'Cara Mengatur Algoritma Shorts Agar Hanya Muncul Konten Edukatif',
    link: 'https://www.youtube.com/results?search_query=reset+algoritma+shorts',
    pubDate: new Date().toISOString(),
    description: 'Format Actionable Tip: Tiga langkah mudah membersihkan watch history untuk melatih kembali rekomendasi feed.',
    author: 'Digital Tips ID',
    videoId: 'yt-demo-04',
  },
];

export async function GET() {
  return handleFetchYouTubeTrends();
}

export async function POST() {
  return handleFetchYouTubeTrends();
}

async function handleFetchYouTubeTrends() {
  try {
    // Attempt live ingestion from YouTube Technology trending RSS or standard topic feed
    const youtubeFeedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ'; // e.g. MKBHD or official tech feed
    const res = await fetch(youtubeFeedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ZeinityRadar/1.0',
        'Accept': 'application/atom+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        ok: true,
        source: 'youtube',
        isFallback: true,
        count: FALLBACK_YOUTUBE_TRENDS.length,
        items: FALLBACK_YOUTUBE_TRENDS,
      });
    }

    const xml = await res.text();
    const items: YouTubeTrendItem[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    const clean = (s: string) =>
      s
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

    while ((match = entryRegex.exec(xml)) !== null && items.length < 10) {
      const block = match[1] || '';
      const titleMatch = block.match(/<title(?:[^>]*)>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
      const pubDateMatch = block.match(/<published(?:[^>]*)>([\s\S]*?)<\/published>/i);
      const descMatch = block.match(/<media:description(?:[^>]*)>([\s\S]*?)<\/media:description>/i);
      const authorMatch = block.match(/<name(?:[^>]*)>([\s\S]*?)<\/name>/i);

      const title = clean(titleMatch ? titleMatch[1] : '');
      const link = linkMatch ? linkMatch[1] : 'https://youtube.com';
      const pubDate = clean(pubDateMatch ? pubDateMatch[1] : new Date().toISOString());
      const description = clean(descMatch ? descMatch[1] : title).slice(0, 300);
      const author = clean(authorMatch ? authorMatch[1] : 'YouTube Creator');

      if (title) {
        items.push({
          title,
          link,
          pubDate,
          description,
          author,
        });
      }
    }

    if (items.length === 0) {
      return NextResponse.json({
        ok: true,
        source: 'youtube',
        isFallback: true,
        count: FALLBACK_YOUTUBE_TRENDS.length,
        items: FALLBACK_YOUTUBE_TRENDS,
      });
    }

    return NextResponse.json({
      ok: true,
      source: 'youtube',
      isFallback: false,
      count: items.length,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      source: 'youtube',
      isFallback: true,
      count: FALLBACK_YOUTUBE_TRENDS.length,
      items: FALLBACK_YOUTUBE_TRENDS,
      notice: err?.message || 'Fallback activated',
    });
  }
}
