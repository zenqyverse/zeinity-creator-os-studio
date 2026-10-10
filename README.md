# Zeinity Creator Studio OS (v2.0)

<p align="center">
  <img src="./public/banner.png" alt="Zeinity Creator Studio Banner" width="100%" />
</p>

<p align="center">
  <img src="./public/logo.png" alt="Zeinity Logo" width="72" height="72" />
  <br />
  <strong>Pusat Komando Produksi YouTube Shorts Terverifikasi untuk Kanal @ZeinityShorts</strong>
  <br />
  <em>Research-backed • High APV Retention • Dynamic Script Economy • Autonomous AI Grounding</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.0_App_Router-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-Realtime_%26_Storage-3ecf8e?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/YouTube-Data_API_v3-ff0000?style=for-the-badge&logo=youtube" alt="YouTube" />
</p>

---

## 📌 Ringkasan & Filosofi Editorial

**Zeinity Creator Studio OS** adalah sistem operasi produksi konten YouTube Shorts yang dirancang khusus untuk memenuhi standar ketat kanal **@ZeinityShorts**. Kanal ini berfokus pada teknologi, kecerdasan buatan (AI), software, gadget, dan dev tools dengan ritme tayang disiplin: **3 Shorts per minggu (Senin, Kamis, Minggu pukul 07:00 WIB)**.

Sistem ini memastikan setiap video yang diproduksi tidak hanya menarik perhatian pada 3 detik pertama (*Hook*), namun juga memiliki **akurasi data faktual terverifikasi**, struktur naskah yang padat tanpa celah *fluff*, dan rasio retensi pemirsa (*Audience Retention / APV*) yang optimal antara **90%–110%**.

---

## 🚀 Fitur Unggulan & Arsitektur Sistem

### 1. Overview Command Center & Daily Action Focus
* **Daily Action Focus Banner**: Algoritma cerdas yang mendeteksi tugas paling kritis hari ini (misal: naskah belum selesai menjelang jadwal rilis terdekat).
* **Snapshot Matrik Studio**: Ringkasan pipeline aktif, naskah dalam pengerjaan, ide mentah yang perlu kurasi, dan sinyal radar tren.
* **Header Identitas Kanal**: Dilengkapi banner dan avatar resmi Zeinity.

### 2. Content Pipeline (Dual View & Deteksi Kanibalisasi)
* **Tampilan Fleksibel**: Beralih instan antara **Tabel Berstruktur** (dengan sorting kolom judul, format, status, deadline, dan target tayang) dan **Papan Kanban Interaktif** (8 tahapan editorial dari *Ide* hingga *Terbit*).
* **Topic Cannibalization Detector**: Menggunakan perhitungan *Jaccard Similarity* dengan pemfilteran kata henti (*stop-words*) Bahasa Indonesia untuk mencegah topik ganda atau berulang (>70% kemiripan).
* **Indikator SLA Overdue**: Peringatan visual jika proses produksi melebihi batas waktu deadline jadwal rilis.
* **Aksi Sekali Klik**: Duplikasi naskah instan (Part 2), lompat langsung ke Script Studio, Research, atau Production Studio.

### 3. Bank Ide & Triage Gate (Multi-Channel Ingestion)
* **Inbox Ide Mentah vs. Backlog Terkurasi**: Gerbang seleksi terpisah agar ide spontan tidak mencemari pipeline resmi.
* **Telegram Bot Ingestion Gateway**: Kirim ide, catatan, tautan berita, atau tangkapan layar langsung dari Telegram ke studio via webhook aman (`/idea`, `/status`, `/ping`).
* **Universal REST API Ingest**: Endpoint terproteksi token (`/api/ingest/idea`) untuk otomasi Apple Shortcuts, ekstensi browser, atau n8n.
* **Shorts Viability Score (0–100)**: Penilaian kelayakan format Shorts (20–60 detik) otomatis berbasis AI dan heuristik lokal.
* **Batch Action**: Seleksi multi-ide untuk diloloskan ke pipeline atau dihapus sekaligus.

### 4. Script Studio & Dynamic Pace Meter
* **Dynamic Script Economy**: Kalibrasi kata aman disesuaikan otomatis dengan format video pada kecepatan rata-rata ~145 kata per menit (WPM):
  * **Flash News (20–30s)**: 50–75 kata
  * **Quick Breakdown (30–45s)**: 75–110 kata
  * **Myth Buster (30–45s)**: 75–110 kata
  * **Actionable Tip (45–60s)**: 110–140 kata
* **Title Validator Bar**: Standar baku judul Zeinity (format pertanyaan: *Apa / Kenapa / Bagaimana*, 5–10 kata, diakhiri tanda tanya `?`).
* **AI Script Tightener ("Pangkas Kata")**: Memotong kalimat bertele-tele agar sesuai alokasi durasi tanpa mengurangi substansi teknis.
* **Generator Judul & Seamless Loop**: Otomasi pembuatan kalimat penutup yang menyambung mulus ke kalimat pembuka (*infinite loop*).
* **Riwayat Versi (Snapshot Restore)**: Pemulihan draft naskah sebelumnya kapan saja.
* **Multi-Format Export**: Ekspor satu klik ke Plain Text, SRT Subtitle bertanda waktu, dan Segmen CapCut.

### 5. Research Studio & Fact-Checking Engine
* **Web Scraper & Metadata Extractor**: Ekstraksi otomatis konten dan tanggal publikasi dari URL rilis resmi menggunakan *Cheerio*.
* **Gemini Google Search Grounding**: Verifikasi klaim dengan pencarian web langsung dan sitasi sumber asli.
* **1-Click Push to Script Payoff**: Suntikkan kutipan bukti faktual langsung ke bagian *Payoff* naskah konten terkait.
* **Stale Fact Warning**: Peringatan badge kuning jika sumber berita berusia lebih dari 6 bulan.

### 6. Production Studio (Storyboard & Voiceover Guidance)
* **Scene Director**: Pemecahan naskah menjadi adegan visual terurut (durasi, deskripsi visual, teks on-screen, dan panduan audio).
* **Visual Readiness Checklist**: Status kesiapan aset (*Siap*, *Perlu Aset*, *Belum Dicek*).
* **Integrasi Voiceover**: Panduan WPM dan catatan intonasi untuk alur rekaman suara.

### 7. Radar Tren (YouTube & Tech RSS)
* **YouTube Data API v3**: Memantau tren video teknologi terpopuler di Indonesia secara live.
* **Curated Tech Feeds**: Fallback kurasi berita AI, developer tools, dan hardware terkini.
* **1-Click Import**: Langsung ubah tren menjadi kartu riset atau ide konten baru.

### 8. Analytics & Learning Hub
* **Sinkronisasi YouTube Channel**: Tarik metrik tayang, rasio bertahan nonton (*Stayed to Watch / APV*), dan persentase *Viewed vs Swiped Away*.
* **Benchmark Status Pills**: Evaluasi otomatis terhadap target Zeinity (APV 90–110%, Viewed $\ge$ 70%).
* **Smart Experiment Engine**: Menganalisis korelasi gaya pembuka (*Hook*) dan format naskah terhadap retensi tertinggi.

### 9. macOS Live Diagnostic Terminal Dock (Ctrl+\`)
* **Terminal Mengambang**: Tampilan jendela bergaya macOS Terminal dengan 3 tombol kontrol lampu lalu lintas.
* **Humanized Root-Cause Parser**: Menerjemahkan pesan galat teknis menjadi penjelasan Bahasa Indonesia dalam 3 poin:
  1. *Apa yang terjadi*
  2. *Akar masalah sebenarnya*
  3. *Langkah solusi konkret*
* **Tes Kesehatan Sistem (1-Click Self Test)**: Evaluasi status koneksi Supabase, YouTube API, AI provider, dan LocalStorage secara instan.

### 10. Navigasi & Auto-Scroll Pintar
* **Auto-Scroll to Top**: Layar otomatis menggulir halus (*smooth scroll*) ke puncak setiap kali berganti tab utama, memilih naskah video, menutup modal formulir, atau beralih sub-tampilan.
* **Tombol Cepat "Ke Atas"**: Tombol mengambang elegan di pojok kanan bawah yang aktif saat halaman digulir melebihi 240px.

---

## 🛠️ Tech Stack & Dependensi

* **Frontend Framework**: Next.js 15 (App Router), React 19, TypeScript
* **Styling**: Tailwind CSS, Lucide React Icons
* **Cloud & Basis Data**: Supabase PostgreSQL, Supabase Realtime, Supabase Storage
* **Integrasi AI**: Google Gemini API (dengan Search Grounding), OpenAI, Anthropic, Groq, DeepSeek, Ollama
* **Pengikis Data**: Cheerio, YouTube Data API v3
* **Penyimpanan Lokal**: Offline-First LocalStorage dengan antrean sinkronisasi otomatis (*mutation replay queue*)

---

## 📦 Panduan Instalasi & Menjalankan Proyek

### 1. Klon Repositori
```bash
git clone https://github.com/zenqyverse/zeinity-creator-os-studio.git
cd zeinity-creator-os-studio
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (.env.local)
Salin berkas template lingkungan:
```bash
cp .env.example .env.local
```

Lengkapi kredensial yang dibutuhkan (semua integrasi memiliki fallback offline jika belum diisi):
```env
# Supabase Personal Cloud (Opsional)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# YouTube Data API v3 (Opsional)
YOUTUBE_API_KEY=

# AI Provider BYOK (Opsional)
GEMINI_API_KEY=

# Telegram Bot Ingest (Opsional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_OWNER_CHAT_ID=

# Universal Ingest Secret
ZEINITY_INGEST_SECRET=super-secret-token
```

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 🧪 Pengujian & Verifikasi

Proyek dilengkapi dengan test suite mandiri untuk memastikan integritas logika bisnis:

```bash
# Uji unit Title Validator, Pace Calculator, dan Exporter
npx tsx test-validator.ts

# Uji integrasi arsitektur, Supabase hybrid fallback, dan AI router
npx tsx test-roadmap-integration.ts

# Uji failover endpoint & fallback
npx tsx test-failover-routes.ts

# Pemeriksaan ketat tipe TypeScript
npx tsc --noEmit
```

---

## ⌨️ Pintasan Keyboard (Global Shortcuts)

| Pintasan | Fungsi |
| :--- | :--- |
| `/` | Buka Pencarian Global (Global Search Modal) |
| `Ctrl + S` / `Cmd + S` | Simpan Instan Draft / Kirim Formulir Aktif |
| `Ctrl + \`` | Buka / Tutup macOS Live Diagnostic Terminal |
| `Esc` | Tutup Modal, Drawer, atau Pencarian Aktif |

---

## 📄 Lisensi & Hak Cipta

Dikelola dan dikembangkan secara eksklusif untuk **Zeinity Studio** (@ZeinityShorts).  
Hak cipta dilindungi undang-undang &copy; 2026.