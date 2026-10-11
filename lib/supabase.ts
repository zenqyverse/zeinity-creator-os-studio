import type { SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('zeinity_supabase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url) url = parsed.url.trim();
        if (parsed.anonKey) anonKey = parsed.anonKey.trim();
      }
    } catch {}
  }

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      'zeinity_supabase_config',
      JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
    );
    _supabaseInstance = null;
    _lastUrl = '';
    _lastKey = '';
  }
}

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
    url.length > 0 &&
    url.startsWith('http') &&
    anonKey &&
    anonKey.length > 0 &&
    !url.includes('placeholder')
  );
};

let _supabaseInstance: SupabaseClient | null = null;
let _lastUrl = '';
let _lastKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) return null;

  if (!_supabaseInstance || _lastUrl !== url || _lastKey !== anonKey) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      _supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      _lastUrl = url;
      _lastKey = anonKey;
    } catch (err) {
      console.warn('[Supabase Init Error]:', err);
      return null;
    }
  }
  return _supabaseInstance;
};

// Proxied supabase client ensuring current active instance is always resolved dynamically
export const supabase: SupabaseClient | null = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) return undefined;
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export interface SupabaseHealthResult {
  configured: boolean;
  connected: boolean;
  latencyMs: number;
  mode: 'cloud' | 'local_storage';
  message: string;
  details?: string;
  url?: string;
}

export async function testSupabaseHealth(): Promise<SupabaseHealthResult> {
  const { url, anonKey } = getSupabaseCredentials();
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      latencyMs: 0,
      mode: 'local_storage',
      message: 'Supabase belum dikonfigurasi. Kunci URL atau Anon Key masih kosong.',
      details: 'Studio saat ini beroperasi dalam mode Offline LocalStorage (semua data tersimpan aman di browser Anda).',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      configured: true,
      connected: false,
      latencyMs: 0,
      mode: 'local_storage',
      message: 'Gagal menginisialisasi klien Supabase. Periksa format URL dan Anon Key.',
    };
  }

  const start = performance.now();
  try {
    const { error, count } = await client
      .from('content_items')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      const errStr = String(error.message || error.code || '').toLowerCase();
      if (
        error.code === 'PGRST204' ||
        error.code === '42P01' ||
        errStr.includes('relation "content_items" does not exist') ||
        errStr.includes('does not exist')
      ) {
        return {
          configured: true,
          connected: false,
          latencyMs,
          mode: 'cloud',
          url,
          message: `Koneksi berhasil (${latencyMs}ms), namun tabel 'content_items' belum ada di database Supabase Anda.`,
          details: 'Jalankan skrip migrasi SQL (001_initial_schema.sql) di SQL Editor Supabase untuk membuat tabel.',
        };
      }
      return {
        configured: true,
        connected: false,
        latencyMs,
        mode: 'cloud',
        url,
        message: `Koneksi ditolak Supabase: ${error.message || error.code}`,
        details: JSON.stringify(error),
      };
    }

    return {
      configured: true,
      connected: true,
      latencyMs,
      mode: 'cloud',
      url,
      message: `Terhubung ke Cloud Supabase! Respon server dalam ${latencyMs}ms. (Total data: ${count ?? 0})`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      configured: true,
      connected: false,
      latencyMs,
      mode: 'cloud',
      url,
      message: `Gagal menjangkau Supabase: ${err.message || 'Network error'}`,
      details: String(err),
    };
  }
}

/**
 * Safe Supabase helper that runs an operation only if Supabase is properly configured.
 * If Supabase is not configured or throws a network/table error, it catches it and returns null/error.
 */
export async function safeSupabaseQuery<T>(
  queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any; offline: boolean }> {
  if (!supabase || !isSupabaseConfigured()) {
    return { data: null, error: null, offline: true };
  }

  try {
    const result = await queryFn(supabase);
    if (result.error) {
      console.warn('[Supabase Query Warning]:', result.error.message || result.error);
      return { data: null, error: result.error, offline: false };
    }
    return { data: result.data, error: null, offline: false };
  } catch (err: any) {
    console.warn('[Supabase Network/Offline Exception]:', err.message || err);
    return { data: null, error: err, offline: true };
  }
}

export async function uploadAssetToSupabase(file: File, path: string): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured()) {
    console.warn('[Supabase Storage Warning]: Supabase not configured. Cannot upload.');
    return null;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('zeinity-media')
      .upload(path, file, {
        upsert: true
      });

    if (error) {
      console.error('[Supabase Storage Error]:', error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('zeinity-media')
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error('[Supabase Storage Exception]:', err.message || err);
    return null;
  }
}
