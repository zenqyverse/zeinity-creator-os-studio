import { NextResponse } from 'next/server';
import { evaluateIdeaSuitability } from '../../../../lib/ai-service';
import { studioStore } from '../../../../lib/storage';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');
    const secret = process.env.ZEINITY_INGEST_SECRET;

    if (secret && authHeader !== `Bearer ${secret}` && authHeader !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, notes, source_url, source } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { viability_score, ai_recommended_pillar, ai_recommended_format } = await evaluateIdeaSuitability(title, notes);

    const ingestedIdea = studioStore.saveContentItem({
      type: 'idea',
      title,
      notes,
      source_url,
      source: source || 'webhook',
      viability_score,
      ai_recommended_pillar,
      ai_recommended_format,
      is_raw: true,
      visual_readiness: 'Belum dicek',
      priority: 'Sedang'
    });

    return NextResponse.json({ ok: true, data: ingestedIdea }, { status: 201 });
  } catch (error) {
    console.error('Ingest webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
