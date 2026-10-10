import { NextResponse } from 'next/server';

interface GoogleTrendItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  approxTraffic?: string;
}

const FALLBACK_GOOGLE_TRENDS: GoogleTrendItem[] = [
  {
    title: 'Model AI Mini On-Device Diluncurkan untuk Ponsel Mid-Range',
    link: 'https://trends.google.com/trends/trendingsearches/daily?geo=ID',
    pubDate: new Date().toISOString(),
    description: 'Pencarian terkait kemampuan komputasi NPU ponsel cerdas tanpa memerlukan koneksi internet meningkat 120% di Indonesia.',
    approxTraffic: '50K+',
  },
  {
    title: 'Update Aturan Privasi WhatsApp Web & Enkripsi Pesan Baru',
    link: 'https://trends.google.com/trends/trendingsearches/daily?geo=ID',
    pubDate: new Date().toISOString(),
    description: 'Fitur kunci chat dan verifikasi ganda WhatsApp menjadi sorotan pengguna di media sosial.',
    approxTraffic: '20K+',
  },
  {
    title: 'Kebijakan Biaya Transaksi QRIS dan Dompet Digital Nasional',
    link: 'https://trends.google.com/trends/trendingsearches/daily?geo=ID',
    pubDate: new Date().toISOString(),
    description: 'Diskusi publik mengenai skema tarif MDR dan perlindungan saldo konsumen digital melonjak pesat.',
    approxTraffic: '100K+',
  },
  {
    title: 'Perilisan Game Mobile Engine Baru dengan Grafis Ray Tracing',
    link: 'https://trends.google.com/trends/trendingsearches/daily?geo=ID',
    pubDate: new Date().toISOString(),
    description: 'Antusiasme komunitas gamer terhadap performa framerate chipset seluler generasi terbaru.',
    approxTraffic: '30K+',
  },
];

export async function GET() {
  return handleFetchGoogleTrends();
}

export async function POST() {
  return handleFetchGoogleTrends();
}

async function handleFetchGoogleTrends() {
  try {
    const rssUrl = 'https://trends.google.com/trending/rss?geo=ID';
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ZeinityRadar/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        ok: true,
        source: 'google',
        isFallback: true,
        count: FALLBACK_GOOGLE_TRENDS.length,
        items: FALLBACK_GOOGLE_TRENDS,
      });
    }

    const xml = await res.text();
    const items: GoogleTrendItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
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

    while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
      const block = match[1] || '';
      const titleMatch = block.match(/<title(?:[^>]*)>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link(?:[^>]*)>([\s\S]*?)<\/link>/i);
      const pubDateMatch = block.match(/<pubDate(?:[^>]*)>([\s\S]*?)<\/pubDate>/i);
      const descMatch = block.match(/<description(?:[^>]*)>([\s\S]*?)<\/description>/i);
      const trafficMatch = block.match(/<ht:approx_traffic(?:[^>]*)>([\s\S]*?)<\/ht:approx_traffic>/i);

      const title = clean(titleMatch ? titleMatch[1] : '');
      const link = linkMatch ? clean(linkMatch[1]) : 'https://trends.google.com';
      const pubDate = clean(pubDateMatch ? pubDateMatch[1] : new Date().toISOString());
      const description = clean(descMatch ? descMatch[1] : title);
      const approxTraffic = trafficMatch ? clean(trafficMatch[1]) : undefined;

      if (title) {
        items.push({
          title,
          link,
          pubDate,
          description,
          approxTraffic,
        });
      }
    }

    if (items.length === 0) {
      return NextResponse.json({
        ok: true,
        source: 'google',
        isFallback: true,
        count: FALLBACK_GOOGLE_TRENDS.length,
        items: FALLBACK_GOOGLE_TRENDS,
      });
    }

    return NextResponse.json({
      ok: true,
      source: 'google',
      isFallback: false,
      count: items.length,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      source: 'google',
      isFallback: true,
      count: FALLBACK_GOOGLE_TRENDS.length,
      items: FALLBACK_GOOGLE_TRENDS,
      notice: err?.message || 'Fallback activated',
    });
  }
}
