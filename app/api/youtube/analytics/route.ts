import { NextResponse } from 'next/server';
import { AnalyticsMetric, ContentItem } from '@/lib/types';

interface SyncAnalyticsRequest {
  channelId?: string;
  contentItems?: ContentItem[];
}

export async function POST(req: Request) {
  try {
    const body: SyncAnalyticsRequest = await req.json().catch(() => ({}));
    const { contentItems = [] } = body;

    // Simulate or retrieve video analytics from channel
    // In production this would call YouTube Analytics API or Data API
    const sampleVideos = [
      {
        videoId: 'vid-01',
        title: 'Bedah Fitur Rahasia Android 15',
        views: 45200,
        shown_in_feed: 62000,
        stayed_to_watch: 74, // 74% (Benchmark >= 70%)
        avg_view_duration: 38,
        apv: 95, // 95% (Benchmark 90-110%)
        likes: 3100,
        subscribers: 240,
        pillar: 'AI & Technology' as const,
        format: 'Quick Breakdown' as const,
      },
      {
        videoId: 'vid-02',
        title: 'DeepSeek R1 vs ChatGPT: Mana Lebih Cerdas?',
        views: 89000,
        shown_in_feed: 115000,
        stayed_to_watch: 78,
        avg_view_duration: 45,
        apv: 104,
        likes: 7200,
        subscribers: 580,
        pillar: 'AI & Technology' as const,
        format: 'Quick Breakdown' as const,
      },
      {
        videoId: 'vid-03',
        title: 'Waspada Modus Phishing APK 2026',
        views: 18400,
        shown_in_feed: 32000,
        stayed_to_watch: 62, // under 70%
        avg_view_duration: 25,
        apv: 82, // under 90%
        likes: 950,
        subscribers: 45,
        pillar: 'Internet & Social Media' as const,
        format: 'Flash News' as const,
      },
    ];

    const results = sampleVideos.map((video) => {
      // Benchmark evaluations
      const passedApv = video.apv >= 90 && video.apv <= 110;
      const passedViewed = video.stayed_to_watch >= 70;

      // Auto-Link with existing content pipeline items
      let matchedContentId: string | undefined = undefined;
      const matchedItem = contentItems.find(
        (item) => {
          const itemTitle = (item?.title || '').toLowerCase();
          const vidTitle = (video?.title || '').toLowerCase();
          if (!itemTitle || !vidTitle) return false;
          return itemTitle.includes(vidTitle) || vidTitle.includes(itemTitle);
        }
      );

      if (matchedItem) {
        matchedContentId = matchedItem.id;
      }

      const metric: AnalyticsMetric = {
        id: `yt-met-${video.videoId}`,
        content_id: matchedContentId,
        title: video.title,
        pillar: video.pillar,
        format: video.format,
        views: video.views,
        shown_in_feed: video.shown_in_feed,
        stayed_to_watch: video.stayed_to_watch,
        avg_view_duration: video.avg_view_duration,
        apv: video.apv,
        likes: video.likes,
        subscribers: video.subscribers,
        traffic_source: 'Shorts Feed (88%)',
        experiment_hypothesis: 'Hook visual cepat + direct problem statement meningkatkan rasio Viewed vs Swiped.',
        experiment_variable: '3s Visual Hook',
        experiment_result: passedApv && passedViewed ? 'Lolos Semua Benchmark' : 'Perlu Evaluasi Retensi',
        experiment_next: 'Gunakan sound trending dengan BPM 120+',
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      return {
        ...metric,
        evaluation: {
          passedApv,
          passedViewed,
          apvBadge: passedApv ? 'Lolos Target APV (90–110%)' : 'Di Bawah Target',
          viewedBadge: passedViewed ? 'Lolos Target Viewed (>=70%)' : 'Di Bawah Target',
        },
      };
    });

    return NextResponse.json({
      ok: true,
      count: results.length,
      metrics: results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to sync YouTube analytics' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) }));
}
