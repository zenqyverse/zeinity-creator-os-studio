import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.length > 0 &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 0 &&
    !supabaseUrl.includes('placeholder')
  );
};

let _supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  if (!_supabaseInstance) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      _supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('[Supabase Init Error]:', err);
      return null;
    }
  }
  return _supabaseInstance;
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? getSupabaseClient()
  : null;

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
