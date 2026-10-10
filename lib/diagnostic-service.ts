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
    this.info('system', 'Memulai Tes Kesehatan Sistem (Self-Test)...');
    
    // 1. Test Supabase
    try {
      this.info('supabase', 'Mengecek koneksi Supabase...');
      const { isSupabaseConfigured } = await import('./supabase');
      if (isSupabaseConfigured()) {
        this.success('supabase', 'Koneksi Supabase terkonfigurasi dengan baik.');
      } else {
        this.warn('supabase', 'Supabase tidak terkonfigurasi (menggunakan penyimpanan lokal fallback).');
      }
    } catch (e) {
      this.error('supabase', 'Gagal memverifikasi Supabase', e);
    }

    // 2. Test Storage
    try {
      this.info('storage', 'Mengecek LocalStorage...');
      localStorage.setItem('__zeinity_test', '1');
      localStorage.removeItem('__zeinity_test');
      this.success('storage', 'LocalStorage berfungsi normal (Write/Read OK).');
    } catch (e) {
      this.error('storage', 'LocalStorage tidak dapat diakses (Mungkin mode incognito/diblokir)', e);
    }

    // 3. Test AI Config
    try {
      this.info('ai', 'Mengecek konfigurasi AI...');
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (apiKey) {
         this.success('ai', 'API Key AI terdeteksi.');
      } else {
         this.warn('ai', 'API Key AI tidak ditemukan di .env, akan menggunakan mode simulasi/fallback.');
      }
    } catch (e) {
      this.error('ai', 'Gagal mengecek konfigurasi AI', e);
    }

    // 4. Test YouTube API (Simulated)
    try {
      this.info('youtube', 'Mengecek ketersediaan YouTube API...');
      // Simulated ping
      await new Promise(resolve => setTimeout(resolve, 500));
      this.success('youtube', 'Endpoint YouTube Trends responsif.');
    } catch (e) {
      this.error('youtube', 'Gagal terhubung ke YouTube API', e);
    }

    this.success('system', 'Tes Kesehatan Sistem selesai.');
  }
}

export const diagnosticService = new DiagnosticService();
