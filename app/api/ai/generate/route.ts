import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, apiKey, model, taskType, context = {}, temperature, systemPrompt, stream } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const defaultSys = systemPrompt || 'Kamu adalah Zeinity Intelligence, asisten YouTube Shorts kanal Zeinity (Paham Dunia Digital dalam 60 Detik). Ringkas, akurat, tanpa basa-basi.';

    let userPrompt = '';
    if (taskType === 'hook') {
      userPrompt = `Buatkan 3 alternatif hook video YouTube Shorts (detik 0–3) untuk topik: "${context.title || context.headline}".
Aturan Zeinity:
- Zero dead air, langsung masuk inti, jangan gunakan salam klise ("Halo guys").
- Wajib ada keselarasan antara On-Screen Text (maksimal 4-6 kata) dan Spoken Hook (maksimal 10-12 kata).
- Formatkan jelas per alternatif.`;
    } else if (taskType === 'seamless_loop') {
      userPrompt = `Buatkan kalimat penutup (detik 46–60) dengan teknik Seamless Loop yang menyambung secara mulus kembali ke pembuka naskah:
Pembuka: "${context.hook || context.title}"
Konteks: "${context.script_context || ''}"
Payoff: "${context.script_payoff || ''}"
Buatkan 1 versi Seamless Loop dan 1 versi Smart CTA langsung.`;
    } else if (taskType === 'fact_check') {
      userPrompt = `Lakukan audit verifikasi fakta naskah Shorts:
Judul: "${context.title}"
Naskah Hook: "${context.hook || ''}"
Naskah Payoff: "${context.script_payoff || ''}"
Rujukan Sumber: ${JSON.stringify(context.sources || [])}
Beri penilaian: apakah klaim didukung bukti sumber resmi? Apa potensi misinformasi atau klaim promosi berlebihan?`;
    } else if (taskType === 'retention_insight') {
      userPrompt = `Analisis performa retensi video YouTube Shorts kanal Zeinity:
Tolok Ukur Baku:
- Viewed vs Swiped Away Target: >= 70%
- Average Percentage Viewed (APV) Target: 90% - 110%
Berdasarkan data performa dan eksperimen terkini:
1. Identifikasi korelasi gaya teks visual di detik 0-3 terhadap lonjakan retensi awal.
2. Analisis pola durasi dan retensi payoff di detik 11-45.
3. Berikan 3 rekomendasi taktis yang dapat langsung diterapkan pada naskah Shorts berikutnya.`;
    } else {
      userPrompt = `Bantu susun 3 sudut pandang (content angles) untuk topik tren: "${context.headline}". Format: Flash News, Quick Breakdown, dan Actionable Tip.`;
    }

    let generatedText = '';
    let totalTokens = 200;

    // Dispatch with real upstream streaming support
    if (provider === 'gemini') {
      const isStreaming = Boolean(stream);
      const endpoint = isStreaming
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:streamGenerateContent?alt=sse&key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: defaultSys }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: temperature ?? 0.7,
            maxOutputTokens: 600,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Gemini error (${res.status}): ${res.statusText}` }, { status: res.status });
      }

      if (isStreaming && res.body) {
        const encoder = new TextEncoder();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readable = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const part = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (part) {
                        controller.enqueue(encoder.encode(part));
                      }
                    } catch {
                      // Skip invalid SSE JSON lines
                    }
                  }
                }
              }
              if (buffer.trim().startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(buffer.trim().slice(6));
                  const part = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (part) controller.enqueue(encoder.encode(part));
                } catch {
                  // Ignore trailing parse errors
                }
              }
            } catch (streamErr: any) {
              controller.error(streamErr);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Tokens-Used': '250',
          },
        });
      }

      const data = await res.json();
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      totalTokens = data.usageMetadata?.totalTokenCount || 250;
    } else if (provider === 'openai' || provider === 'groq' || provider === 'openrouter') {
      const endpoint =
        provider === 'groq'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';

      const isStreaming = Boolean(stream);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: defaultSys },
            { role: 'user', content: userPrompt },
          ],
          temperature: temperature ?? 0.7,
          max_tokens: 600,
          stream: isStreaming,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: `${provider} error (${res.status}): ${res.statusText}` }, { status: res.status });
      }

      if (isStreaming && res.body) {
        const encoder = new TextEncoder();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readable = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    if (jsonStr === '[DONE]') continue;
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      if (delta) {
                        controller.enqueue(encoder.encode(delta));
                      }
                    } catch {
                      // Skip invalid SSE JSON lines
                    }
                  }
                }
              }
            } catch (streamErr: any) {
              controller.error(streamErr);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Tokens-Used': '250',
          },
        });
      }

      const data = await res.json();
      generatedText = data.choices?.[0]?.message?.content || '';
      totalTokens = data.usage?.total_tokens || 250;
    } else if (provider === 'anthropic') {
      const isStreaming = Boolean(stream);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-latest',
          system: defaultSys,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: 600,
          temperature: temperature ?? 0.7,
          stream: isStreaming,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Anthropic error (${res.status}): ${res.statusText}` }, { status: res.status });
      }

      if (isStreaming && res.body) {
        const encoder = new TextEncoder();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readable = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    try {
                      const parsed = JSON.parse(jsonStr);
                      if (parsed.type === 'content_block_delta') {
                        const delta = parsed.delta?.text;
                        if (delta) controller.enqueue(encoder.encode(delta));
                      }
                    } catch {
                      // Skip invalid SSE JSON lines
                    }
                  }
                }
              }
            } catch (streamErr: any) {
              controller.error(streamErr);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Tokens-Used': '250',
          },
        });
      }

      const data = await res.json();
      generatedText = data.content?.[0]?.text || '';
      totalTokens = (data.usage?.input_tokens || 100) + (data.usage?.output_tokens || 150);
    }

    return NextResponse.json({
      text: generatedText,
      tokensUsed: totalTokens,
    });
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return NextResponse.json(
      { error: err.message || (isTimeout ? 'Provider timeout' : 'Internal error') },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
