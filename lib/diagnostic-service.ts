export type LogLevel = 'info' | 'warn' | 'error' | 'success';
export type Subsystem = 'supabase' | 'ai' | 'youtube' | 'radar' | 'validator' | 'storage' | 'system';

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  subsystem: Subsystem;
  message: string;
  details?: string;
  humanizedExplanation?: HumanizedExplanation;
}

export interface HumanizedExplanation {
  whatHappened: string;
  rootCause: string;
  actionableSteps: string[];
}

class DiagnosticService {
  private logs: DiagnosticLog[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initBootLogs();
  }

  private initBootLogs() {
    const ts = new Date().toISOString();
    this.logs = [
      {
        id: this.generateId(),
        timestamp: ts,
        level: 'info',
        subsystem: 'system',
        message: 'Zeinity Diagnostic Engine v2.0 aktif.',
        details: 'Monitoring realtime untuk Cloud Supabase, AI Provider, YouTube API, Radar, Validator, dan Storage.',
      },
      {
        id: this.generateId(),
        timestamp: ts,
        level: 'info',
        subsystem: 'storage',
        message: 'Subsystem penyimpanan aktif: LocalStorage cache ready.',
      },
      {
        id: this.generateId(),
        timestamp: ts,
        level: 'info',
        subsystem: 'validator',
        message: 'Engine Script & Title Validator terkalibrasi (130–160 WPM safe economy).',
      },
    ];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getLogs(): DiagnosticLog[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  private generateId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  public log(level: LogLevel, subsystem: Subsystem, message: string, details?: string, error?: any) {
    let humanizedExplanation: HumanizedExplanation | undefined = undefined;

    if (level === 'error' && error) {
      humanizedExplanation = this.parseError(error, subsystem);
    }

    const logEntry: DiagnosticLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      subsystem,
      message,
      details,
      humanizedExplanation,
    };

    this.logs.unshift(logEntry);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs.pop();
    }
    
    this.notify();
  }

  public info(subsystem: Subsystem, message: string, details?: string) {
    this.log('info', subsystem, message, details);
  }

  public warn(subsystem: Subsystem, message: string, details?: string) {
    this.log('warn', subsystem, message, details);
  }

  public error(subsystem: Subsystem, message: string, error?: any, details?: string) {
    this.log('error', subsystem, message, details, error);
  }

  public success(subsystem: Subsystem, message: string, details?: string) {
    this.log('success', subsystem, message, details);
  }

  private parseError(error: any, subsystem: Subsystem): HumanizedExplanation {
    const errorStr = String(error?.message || error).toLowerCase();

    // CORS
    if (errorStr.includes('cors') || errorStr.includes('access-control-allow-origin')) {
      return {
        whatHappened: 'Aplikasi tidak dapat terhubung ke server eksternal.',
        rootCause: 'Kebijakan keamanan browser (CORS) memblokir permintaan karena berasal dari domain yang tidak diizinkan.',
        actionableSteps: [
          'Pastikan URL API tujuan sudah dikonfigurasi dengan benar.',
          'Jika ini di lingkungan development, coba gunakan proxy atau ekstensi browser bypass CORS sementara.',
          'Periksa konfigurasi CORS di server tujuan (misalnya di dashboard Supabase).'
        ]
      };
    }

    // Rate Limit / Quota
    if (errorStr.includes('rate limit') || errorStr.includes('429') || errorStr.includes('quota')) {
      return {
        whatHappened: 'Permintaan ke layanan ditolak karena terlalu sering atau kuota habis.',
        rootCause: 'Sistem telah mencapai batas maksimal permintaan yang diizinkan oleh penyedia layanan (API rate limit).',
        actionableSteps: [
          'Tunggu beberapa saat sebelum mencoba kembali.',
          'Periksa dashboard penggunaan API (misal: OpenAI, YouTube) untuk melihat sisa kuota.',
          'Pertimbangkan untuk meng-upgrade paket layanan API Anda jika ini sering terjadi.'
        ]
      };
    }

    // Network Drop
    if (errorStr.includes('network') || errorStr.includes('offline') || errorStr.includes('failed to fetch')) {
      return {
        whatHappened: 'Gagal menghubungi server karena masalah jaringan.',
        rootCause: 'Koneksi internet terputus atau server tujuan tidak dapat dijangkau (down).',
        actionableSteps: [
          'Periksa koneksi internet perangkat Anda.',
          'Pastikan server tujuan sedang tidak mengalami gangguan.',
          'Data Anda akan disimpan secara lokal dan otomatis disinkronkan saat koneksi kembali.'
        ]
      };
    }
    
    // PGRST Schema (Supabase)
    if (errorStr.includes('pgrst') || errorStr.includes('relation') || errorStr.includes('does not exist')) {
      return {
        whatHappened: 'Gagal menyimpan atau mengambil data dari database.',
        rootCause: 'Terdapat ketidaksesuaian antara skema data aplikasi dengan tabel di Supabase (kolom/tabel tidak ditemukan).',
        actionableSteps: [
          'Periksa apakah migrasi database terbaru sudah dijalankan.',
          'Pastikan nama tabel dan kolom di kode sesuai dengan yang ada di dashboard Supabase.',
          'Lakukan sinkronisasi ulang skema database.'
        ]
      };
    }

    // Invalid Token
    if (errorStr.includes('token') || errorStr.includes('unauthorized') || errorStr.includes('401')) {
      return {
        whatHappened: 'Akses ditolak karena masalah autentikasi.',
        rootCause: 'Token kredensial tidak valid, sudah kadaluarsa, atau tidak memiliki izin (Unauthorized).',
        actionableSteps: [
          'Silakan logout dan login kembali untuk memperbarui sesi Anda.',
          'Periksa apakah API Key di pengaturan (.env) sudah dimasukkan dengan benar.',
          'Pastikan token belum expired.'
        ]
      };
    }

    // Default Fallback
    return {
      whatHappened: 'Terjadi kesalahan sistem yang tidak terduga.',
      rootCause: `Pesan error teknis: ${error?.message || errorStr}`,
      actionableSteps: [
        'Coba muat ulang halaman (Refresh).',
        'Jika masalah berlanjut, hubungi tim dukungan teknis.',
        'Sertakan pesan error ini saat melaporkan masalah.'
      ]
    };
  }

  public async runSelfTest() {
    this.info('system', 'Memulai Tes Kesehatan Sistem Komprehensif...');

    // 1. Storage Health (Real write/read check)
    try {
      this.info('storage', 'Mengecek ketersediaan & izin LocalStorage...');
      const testKey = `__zeinity_test_${Date.now()}`;
      localStorage.setItem(testKey, 'ok');
      const readVal = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      if (readVal === 'ok') {
        this.success('storage', 'LocalStorage berfungsi 100% normal (Read/Write OK).');
      } else {
        this.warn('storage', 'LocalStorage tidak mengembalikan nilai yang sesuai.');
      }
    } catch (e: any) {
      this.error('storage', 'LocalStorage tidak dapat diakses (Mungkin mode incognito/diblokir browser)', e);
    }

    // 2. Supabase Cloud Health (Real query ping via testSupabaseHealth)
    try {
      this.info('supabase', 'Memverifikasi status koneksi Supabase...');
      const { testSupabaseHealth } = await import('./supabase');
      const health = await testSupabaseHealth();
      if (health.connected) {
        this.success('supabase', health.message, health.details);
      } else if (!health.configured) {
        this.info('supabase', health.message, health.details);
      } else {
        this.warn('supabase', health.message, health.details);
      }
    } catch (e: any) {
      this.error('supabase', 'Gagal memverifikasi status Supabase', e);
    }

    // 3. AI Providers Health (Real check of configured API keys)
    try {
      this.info('ai', 'Mengecek konfigurasi AI Provider (BYOK)...');
      let configs: any[] = [];
      if (typeof window !== 'undefined') {
        try {
          configs = JSON.parse(localStorage.getItem('zeinity_ai_configs') || '[]');
        } catch {}
      }
      const activeProviders = configs
        .filter((c: any) => c.apiKey && c.apiKey.trim().length > 0)
        .map((c: any) => c.provider);

      if (activeProviders.length > 0) {
        this.success('ai', `Provider AI aktif terdeteksi: ${activeProviders.join(', ')}.`);
      } else {
        this.warn('ai', 'Belum ada API Key AI yang diisi di Pengaturan. AI beroperasi dalam mode offline prompt template.');
      }
    } catch (e: any) {
      this.warn('ai', 'Pemeriksaan konfigurasi AI provider dilewati.');
    }

    // 4. YouTube API / Radar Health (Real fetch to /api/trends/youtube)
    try {
      this.info('youtube', 'Mengecek responsivitas endpoint YouTube Trends...');
      const res = await fetch('/api/trends/youtube');
      if (res.ok) {
        const data = await res.json();
        this.success('youtube', `Endpoint YouTube Trends responsif (${data.trends?.length || 0} tren dimuat, sumber: ${data.source || 'default'}).`);
      } else {
        this.warn('youtube', `Endpoint YouTube Trends merespon status ${res.status}.`);
      }
    } catch (e: any) {
      this.warn('youtube', 'Endpoint YouTube Trends tidak dapat dijangkau langsung (menggunakan cache lokal).');
    }

    // 5. Validator Engine Calibration Check
    try {
      this.info('validator', 'Mengecek kalibrasi Validator Naskah & Judul...');
      const { validateTitle, calculateScriptEconomy } = await import('./validator');
      const titleRes = validateTitle('Apa Rahasia Algoritma YouTube Shorts Terbaru?');
      const scriptRes = calculateScriptEconomy(
        'Pernahkah kamu bertanya bagaimana sistem ini bekerja?',
        'Kecerdasan buatan sekarang mampu memproses data secara instan.',
        'Solusinya adalah arsitektur offline-first dan sinkronisasi cloud.',
        'Simpan video ini untuk referensi nanti.',
        'Quick Breakdown',
        145
      );
      if (titleRes.isValid && scriptRes.isWordCountSafe) {
        this.success('validator', 'Validator beroperasi normal (Algoritma WPM & Rumus Judul valid).');
      } else {
        this.warn('validator', 'Validator mendeteksi deviasi parameter kalibrasi.');
      }
    } catch (e: any) {
      this.error('validator', 'Gagal memverifikasi modul validator', e);
    }

    // 6. Telegram Gateway Health
    try {
      this.info('system', 'Mengecek status Telegram Bot Gateway...');
      let tgConfig: any = {};
      if (typeof window !== 'undefined') {
        try {
          tgConfig = JSON.parse(localStorage.getItem('zeinity_telegram_config') || '{}');
        } catch {}
      }
      if (tgConfig.token) {
        const res = await fetch(`/api/telegram/poll?token=${encodeURIComponent(tgConfig.token)}&limit=1`);
        const json = await res.json();
        if (json.ok) {
          this.success('system', `Telegram Bot terhubung (@${json.bot?.username || 'Bot'}). Mode Polling siap.`);
        } else {
          this.warn('system', `Telegram Bot Token tidak valid: ${json.error || 'Galat otentikasi'}`);
        }
      } else {
        this.info('system', 'Telegram Bot belum dikonfigurasi (dapat diatur di menu Pengaturan > Telegram Bot).');
      }
    } catch {
      this.info('system', 'Pemeriksaan Telegram Bot dilewati.');
    }

    this.success('system', 'Tes Kesehatan Sistem selesai.');
  }
}

export const diagnosticService = new DiagnosticService();
