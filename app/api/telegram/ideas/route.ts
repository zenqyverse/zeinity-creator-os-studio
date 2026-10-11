import { NextResponse } from 'next/server';
import { getQueuedTelegramIdeas, clearQueuedTelegramIdeas } from '../../../../lib/telegram-queue';

export async function GET() {
  const ideas = getQueuedTelegramIdeas();
  return NextResponse.json({
    ideas,
    count: ideas.length,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === 'clear') {
      clearQueuedTelegramIdeas();
      return NextResponse.json({ ok: true, message: 'Queue cleared' });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
