import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const { provider, apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      return NextResponse.json(
        { ok: false, message: 'API key is required' },
        { status: 400 }
      );
    }

    let ok = false;
    let message = '';
    let models: string[] = [];

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        models = (data.models || [])
          .map((m: any) => m.name.replace(/^models\//, ''))
          .filter((m: string) => m.includes('gemini'));
        ok = true;
        message = `Google Gemini terkoneksi (${models.length} model ditemukan)`;
      } else {
        const err = await res.json().catch(() => ({}));
        message = err?.error?.message || `HTTP ${res.status}: Gagal otentikasi Gemini`;
      }
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || [])
          .map((m: any) => m.id)
          .filter((id: string) => id.startsWith('gpt') || id.startsWith('o3'));
        ok = true;
        message = `OpenAI terkoneksi (${models.length} model ditemukan)`;
      } else {
        message = `HTTP ${res.status}: API Key OpenAI tidak valid atau quota habis`;
      }
    } else if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
        ok = true;
        message = `Groq terkoneksi (${models.length} model ditemukan)`;
      } else {
        message = `HTTP ${res.status}: API Key Groq tidak valid`;
      }
    } else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).slice(0, 30).map((m: any) => m.id);
        ok = true;
        message = `OpenRouter terkoneksi (${models.length} model ditemukan)`;
      } else {
        message = `HTTP ${res.status}: API Key OpenRouter tidak valid`;
      }
    } else if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).map((m: any) => m.id);
        ok = true;
        message = `Anthropic Claude terkoneksi (${models.length} model ditemukan)`;
      } else {
        message = `HTTP ${res.status}: API Key Anthropic tidak valid`;
      }
    } else {
      message = 'Provider tidak dikenali';
    }

    const latencyMs = Date.now() - start;
    return NextResponse.json({ ok, latencyMs, message, models });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return NextResponse.json({
      ok: false,
      latencyMs,
      message: err.message || 'Koneksi gagal atau timeout ke provider',
    });
  }
}
