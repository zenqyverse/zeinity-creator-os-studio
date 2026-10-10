import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    const cleanFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. If Supabase Storage is configured, attempt upload to 'zeinity-assets' bucket
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: uploadError } = await supabase.storage
          .from('zeinity-assets')
          .upload(cleanFilename, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from('zeinity-assets')
            .getPublicUrl(cleanFilename);

          return NextResponse.json({
            ok: true,
            url: publicData.publicUrl,
            filename: file.name,
            size: file.size,
            type: file.type,
            storage: 'supabase',
          });
        } else {
          console.warn('[Supabase Storage Upload Notice]:', uploadError.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Storage Exception]:', err?.message || err);
      }
    }

    // 2. Offline / Local Fallback: Convert to Base64 Data URI
    const mime = file.type || 'application/octet-stream';
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;

    return NextResponse.json({
      ok: true,
      url: dataUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      storage: 'data-uri-fallback',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses file' }, { status: 500 });
  }
}
