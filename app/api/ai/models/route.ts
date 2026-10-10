import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ models: [] });
    }

    let models: string[] = [];

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || [])
          .map((m: any) => m.id)
          .filter((id: string) => id.includes('gpt') || id.includes('o3') || id.includes('o1'));
      }
    } else if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.models || [])
          .map((m: any) => m.name.replace(/^models\//, ''))
          .filter((id: string) => id.includes('gemini'));
      }
    } else if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
      }
    } else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).slice(0, 40).map((m: any) => m.id);
      }
    } else if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
      }
    }

    return NextResponse.json({ models });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, models: [] }, { status: 500 });
  }
}
