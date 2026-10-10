# Analisis Kriteria Fitur Web App untuk Zeinity Shorts

Berdasarkan dokumen *Strategi & Identitas Channel Zeinity Shorts* dan infografis interaktif yang dilampirkan, aplikasi web yang paling cocok untuk Zeinity bukan sekadar *content planner* atau aplikasi pencatat ide, melainkan sebuah **Creator Studio khusus produksi YouTube Shorts**.

Aplikasi ini idealnya membantu mengelola satu alur kerja secara terpadu: mulai dari menemukan informasi digital terbaru, memverifikasi sumber, menyusun naskah, menyiapkan visual, memproduksi video, menjadwalkan publikasi, sampai mengevaluasi performanya.

Alasannya, Zeinity mempunyai kebutuhan yang cukup spesifik: konten berdurasi 20–60 detik, lima pilar konten, empat format video, standar judul tertentu, batas jumlah kata, standar visual vertikal, serta jadwal publikasi tiga kali seminggu.

Analisis ini membedakan tiga hal:

- **Kebutuhan inti:** fitur yang langsung mendukung aturan operasional Zeinity.
- **Fitur pengembangan:** fitur yang akan membuat proses produksi lebih efisien.
- **Fitur lanjutan:** fitur yang baru layak dibangun ketika kebutuhan dasarnya sudah terpenuhi.

## 1. Gambaran Produk yang Paling Sesuai

### 01. Creator Command Center

**Prioritas tinggi**

Pusat kendali yang menampilkan status seluruh konten, deadline, agenda publikasi, riset terbaru, serta pekerjaan yang perlu diselesaikan hari ini.

### 02. Script & Research Studio

**Prioritas tinggi**

Tempat mengembangkan ide, menyimpan sumber resmi, menyusun naskah, memeriksa batas kata dan durasi, serta menghasilkan judul yang sesuai pedoman Zeinity.

### 03. Shorts Production Studio

Tempat mengatur urutan narasi, voice-over, B-roll, caption, aset visual, dan komposisi 9:16 sebelum hasil akhir masuk tahap publikasi.

### 04. Performance & Learning Center

Tempat mencatat hasil publikasi, membandingkan performa antarvideo, mengevaluasi hook dan retensi, lalu mengubah temuan tersebut menjadi keputusan konten berikutnya.

Keempat bagian tersebut sebaiknya menggunakan satu basis data konten yang sama, bukan menjadi empat alat yang berdiri sendiri. Pendekatan ini menghubungkan perencanaan, produksi, publikasi, dan analitik dalam satu alur kerja.

## 2. Kriteria Fitur yang Paling Penting

**Prioritas:** P0 = fondasi wajib, P1 = pengembangan penting, P2 = lanjutan.

| Fitur | Kriteria yang harus dipenuhi | Prioritas |
|---|---|---|
| Dashboard produksi | Status konten, tugas tertunda, deadline dan jadwal publikasi | P0 |
| Content calendar | Kalender mingguan/bulanan, jadwal Senin–Kamis–Minggu pukul 07.00 WIB, pengingat | P0 |
| Idea bank | Menyimpan ide, kategori, sumber inspirasi, status dan potensi visual | P0 |
| Research & source manager | URL sumber, kutipan atau fakta pendukung, tanggal sumber, status verifikasi | P0 |
| Script editor | Editor naskah dengan tahapan Hook → Context → Core Payoff → Ending | P0 |
| Script calculator | Penghitung kata, estimasi durasi dan indikator kesesuaian standar | P0 |
| Title validator | Pemeriksaan kalimat tanya, awalan Apa/Kenapa/Bagaimana dan panjang 5–10 kata | P0 |
| Production checklist | Checklist voice-over, B-roll, caption, audio dan pemeriksaan akhir | P0 |
| Asset library | Penyimpanan rekaman layar, gambar, audio, B-roll dan aset proyek | P1 |
| Safe-zone simulator | Preview 9:16 dengan area aman atas 15%, tengah 60% dan bawah 25% | P1 |
| Visual storyboard | Pemetaan narasi ke shot, timestamp, B-roll dan teks layar | P1 |
| Shorts analytics | Pencatatan performa per video dan evaluasi berdasarkan metrik | P1 |
| AI research & scripting | Membantu mencari referensi, merangkum fakta dan menyusun draf | P1 |
| YouTube integration | Mengimpor data analitik dan metadata video melalui API yang sesuai | P2 |
| Workflow automation | Otomatisasi tugas, pengingat deadline dan perubahan status | P2 |

Kriteria di atas adalah rekomendasi rancangan aplikasi, bukan klaim bahwa semua fitur tersebut sudah tersedia dalam infografis.

## 3. Modul yang Perlu Dirancang Lebih Mendalam

### A. Content Pipeline & Calendar

**P0 · Fondasi operasional**

Satu konten harus memiliki identitas dan status yang konsisten sejak berupa ide hingga terbit.

**Kriteria yang disarankan:**

- Status: Ide → Riset → Penulisan → Siap Produksi → Editing → Review → Terjadwal → Terbit.
- Tampilan kalender, kanban dan daftar.
- Filter berdasarkan lima pilar konten, format Shorts dan status.
- Tanggal publikasi, tenggat produksi dan pengingat.
- Riwayat perubahan status serta indikator konten yang terlambat.
- Deteksi ide atau topik yang terlalu mirip dengan konten sebelumnya.

**Catatan:** jadwal publikasi tidak boleh otomatis dianggap sebagai deadline produksi. Keduanya perlu menjadi field yang berbeda.

### B. Research & Fact-Checking Studio

**P0 · Pembeda utama Zeinity**

Karena Zeinity mengutamakan pembaruan digital, fakta resmi dan changelog, aplikasi sebaiknya tidak berhenti pada daftar ide. Aplikasi perlu membantu memastikan setiap klaim memiliki landasan yang bisa diperiksa.

**Kriteria yang disarankan:**

- Formulir riset dengan nama platform, topik, tanggal kejadian dan tanggal publikasi sumber.
- Penyimpanan tautan pengumuman resmi, dokumentasi dan changelog.
- Kolom klaim, bukti, kutipan singkat dan kesimpulan.
- Status verifikasi: Belum Dicek, Terverifikasi, Perlu Konfirmasi atau Kedaluwarsa.
- Penanda informasi yang hanya berupa rumor atau klaim promosi.
- Peringatan jika informasi terbaru berpotensi mengubah naskah yang sudah dibuat.

**Kriteria penting:** AI tidak boleh menandai sebuah klaim sebagai fakta hanya karena menghasilkan jawaban yang terdengar meyakinkan. Status verifikasi harus didasarkan pada bukti yang benar-benar diperiksa.

### C. Script & Title Studio

**P0 · Memanfaatkan infografis yang sudah ada**

Infografis HTML sudah memperlihatkan konsep *Script Economy & Pace Calculator*, pemilihan format dengan simulasi timeline, serta validator judul. Ini sebaiknya dijadikan fitur kerja nyata, bukan sekadar elemen demonstrasi.

**Kriteria yang disarankan:**

- Editor naskah dengan penyimpanan otomatis dan riwayat revisi.
- Pilihan format: Flash News, Quick Breakdown, Actionable Tip dan Myth Buster.
- Template struktur naskah berubah mengikuti format yang dipilih.
- Penghitung kata dan estimasi durasi berdasarkan tempo bicara.
- Validator judul dengan penjelasan kesalahan, bukan hanya indikator lulus/gagal.
- Generator alternatif hook, judul dan ending.
- Hubungan antara setiap klaim naskah dan sumber risetnya.
- Ekspor naskah ke teks biasa agar mudah dipindahkan ke perangkat kerja lain.

**Logika validator:** target naskah 90–140 kata dan tempo 130–160 kata per menit harus dapat dikonfigurasi. Sistem juga perlu menunjukkan bahwa lolos jumlah kata belum tentu berarti naskah cocok dengan durasi target.

### D. Visual Production & Safe-Zone Studio

**P1 · Mempercepat proses editing**

Fokusnya bukan menggantikan CapCut atau editor video desktop secara langsung, melainkan mempersiapkan materi produksi dengan lebih terstruktur.

**Kriteria yang disarankan:**

- Kanvas vertikal 9:16 dengan ukuran acuan 1080 × 1920.
- Lapisan simulasi antarmuka YouTube Shorts.
- Area aman atas, tengah dan bawah yang dapat ditampilkan atau disembunyikan.
- Storyboard per segmen narasi dengan timestamp.
- Daftar shot, sumber B-roll, teks overlay dan efek penyorot.
- Checklist caption dinamis, keterbacaan, kontras dan kualitas audio.
- Penyimpanan aset per video, bukan hanya satu perpustakaan yang tidak terorganisasi.

**Batasan penting:** preview komposisi dan storyboard bukan pengganti rendering video final. Jangan membangun editor video penuh pada tahap pertama jika kebutuhan utamanya adalah mengelola produksi.

### E. Analytics & Content Intelligence

**P1 · Evaluasi berbasis data**

Dokumen Zeinity menetapkan target internal untuk rasio penonton yang memilih menonton dan *Average Percentage Viewed* (APV). Aplikasi harus dapat membandingkan hasil aktual dengan target tersebut.

**Kriteria yang disarankan:**

- Input manual metrik jika belum ada integrasi YouTube.
- Impor data ketika integrasi tersedia.
- Perbandingan performa berdasarkan pilar, format, topik dan gaya hook.
- Tren performa dari waktu ke waktu.
- Catatan evaluasi: apa yang berhasil, apa yang gagal dan apa yang akan diuji berikutnya.
- Rekomendasi eksperimen berdasarkan data historis, bukan klaim bahwa video tertentu pasti viral.

Metrik YouTube Analytics dapat mencakup *shown in feed*, *stayed to watch*, *average view duration*, *average percentage viewed*, likes, subscriber dan sumber trafik. Nama dan definisi metrik perlu mengikuti data aktual dari YouTube.

**Penting:** target 70% dan APV 90–110% dalam dokumen adalah target strategi Zeinity, bukan jaminan keberhasilan algoritma.

## 4. Kriteria Khusus untuk AI di Aplikasi Zeinity

AI sebaiknya menjadi **asisten yang terintegrasi dengan workflow**, bukan chatbot generik yang berdiri sendiri.

| Kapabilitas AI | Hasil yang diharapkan |
|---|---|
| Topic discovery | Daftar kandidat topik baru sesuai lima pilar |
| Research assistant | Ringkasan sumber dengan tautan dan tanggal publikasi |
| Fact-check assistant | Daftar klaim yang perlu diperiksa dan bukti pendukung |
| Script assistant | Draf naskah mengikuti format dan batasan Zeinity |
| Title assistant | Alternatif judul yang diperiksa menggunakan validator |
| Visual assistant | Rekomendasi screenshot, B-roll dan teks overlay untuk setiap bagian |
| Performance assistant | Analisis pola performa dan usulan eksperimen konten berikutnya |

Setiap fungsi sebaiknya memiliki input, output, dan batasan yang jelas. Misalnya, *Script Assistant* menerima topik dan sumber yang sudah dikurasi, lalu menghasilkan draf beserta rujukan yang terkait. AI tidak boleh diam-diam mengarang sumber atau menambahkan fakta yang tidak didukung referensi.

Untuk riset tren 24–72 jam terakhir, hasilnya perlu menampilkan waktu pencarian, tanggal sumber, dan status pemeriksaan. Ini penting karena konten Zeinity sangat bergantung pada informasi yang cepat berubah.

## 5. Kriteria UI/UX yang Sesuai

Infografis yang dilampirkan sudah mengarah ke desain dark mode, glassmorphism, kartu interaktif, pemilihan pilar, kalkulator dan simulasi safe zone. Gaya tersebut bisa dipertahankan sebagai identitas visual, tetapi aplikasi operasional perlu mengutamakan keterbacaan dan kecepatan kerja.

### Standar antarmuka yang direkomendasikan

**Responsif desktop dan mobile**

Desktop menjadi ruang kerja utama untuk riset, penyuntingan naskah dan pengelolaan produksi. Mobile difokuskan untuk memeriksa jadwal, membaca riset, menyunting teks dan menandai tugas.

**Dark mode sebagai tema utama**

Pertahankan aksen indigo, cyan dan pink dari infografis, tetapi jangan sampai efek blur, glow atau transparansi mengurangi kontras teks.

**Interaksi yang fungsional**

Setiap tombol, kalkulator, filter dan simulasi harus benar-benar bekerja, menyimpan hasil, dan memberikan umpan balik yang jelas.

**Penyimpanan dan pemulihan pekerjaan**

Sediakan indikator status penyimpanan, autosave, penanganan konflik perubahan dan pemulihan revisi agar naskah tidak hilang.

**Aksesibilitas dan efisiensi**

Ukuran teks nyaman, fokus keyboard terlihat, pesan kesalahan spesifik, dan formulir tidak meminta data yang sebenarnya tidak diperlukan.

## 6. Urutan Pengembangan yang Paling Rasional

Tidak semua fitur perlu dibangun sekaligus. Urutan berikut memungkinkan aplikasi dipakai lebih awal dan mengurangi risiko fondasi data perlu dirombak ketika kebutuhan bertambah kompleks.

### Tahap 1 — Fondasi Operasional (MVP)

- Dashboard.
- Content pipeline.
- Kalender.
- Idea bank.
- Database konten.
- Research manager.
- Script editor.
- Word counter.
- Title validator.

### Tahap 2 — Produksi Visual

- Safe-zone simulator.
- Storyboard.
- Asset library.
- Checklist editing.
- Ekspor materi produksi.

### Tahap 3 — AI dan Otomasi

- Riset berbantuan AI.
- Pembuatan draf.
- Pemeriksaan kepatuhan pedoman.
- Pengingat dan otomatisasi status.

### Tahap 4 — Analitik dan Integrasi

- Integrasi YouTube.
- Impor metrik.
- Perbandingan performa.
- Rekomendasi eksperimen konten.

Untuk aplikasi yang akan terus berkembang, struktur data sebaiknya memisahkan entitas konten, sumber riset, versi naskah, aset, jadwal publikasi dan hasil analitik. Hubungkan semuanya menggunakan ID, bukan dengan menyalin informasi yang sama ke banyak tempat.

## 7. Fitur yang Tidak Perlu Diprioritaskan Sekarang

Agar pengembangan tidak melebar, hal-hal berikut tidak perlu menjadi kebutuhan awal:

- Editor video penuh dengan timeline rendering kompleks.
- Sistem manajemen tim, persetujuan bertingkat dan pembagian peran yang rumit jika masih bekerja sendiri.
- Otomatisasi publikasi penuh sebelum kebutuhan integrasi dan autentikasi API dipastikan.
- Generator konten AI yang memproduksi banyak naskah tanpa pemeriksaan sumber.
- Sistem prediksi viral yang mengklaim bisa menjamin views.
- Dashboard dengan terlalu banyak grafik yang tidak menghasilkan keputusan operasional.

Saran ini bukan berarti fitur tersebut tidak berguna, melainkan belum terbukti menjadi hambatan utama berdasarkan dokumen yang tersedia.

## Kesimpulan

Identitas produk yang paling tepat adalah **Zeinity Creator Studio — workspace produksi YouTube Shorts berbasis riset dan standar editorial**.

Nilai utamanya bukan jumlah fitur, tetapi seberapa baik aplikasi menjaga konsistensi proses dari ide sampai evaluasi. Infografis yang sudah ada bisa menjadi titik awal modul interaktif, sementara dokumen strategi menjadi aturan yang menggerakkan validator, template, kalender, checklist dan analitik.

Jika harus memilih hanya lima hal untuk dibangun lebih dahulu, urutannya adalah:

1. **Content Pipeline & Calendar**
2. **Research & Source Manager**
3. **Script Editor + Validator**
4. **Production Checklist + Asset Library**
5. **Analytics & Learning Center**

Dengan fondasi tersebut, Zeinity memiliki aplikasi yang tidak hanya terlihat menarik, tetapi juga benar-benar membantu menjaga ritme produksi tiga Shorts per minggu tanpa mengorbankan akurasi dan konsistensi editorial.
