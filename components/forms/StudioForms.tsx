'use client';

import React, { useState, useEffect } from 'react';
import {
  ContentItem,
  ResearchSource,
  MediaAsset,
  AnalyticsMetric,
  Pillar,
  VideoFormat,
  ContentTier,
  AspectRatio,
  EditorialStatus,
  Priority,
  VisualReadiness,
  VerificationStatus,
  AssetType,
} from '../../lib/types';
import { TitleValidatorBar } from '../TitleValidatorBar';
import { validateTitle } from '../../lib/validator';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import { ConfirmDialogModal } from '../ConfirmDialogModal';
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

const STOP_WORDS = new Set([
  'apa', 'apakah', 'siapa', 'kapan', 'di', 'mana', 'dimana', 'ke', 'dari', 
  'kenapa', 'mengapa', 'bagaimana', 'bisa', 'atau', 'dan', 'yang', 'untuk', 
  'dengan', 'dalam', 'pada', 'adalah', 'ini', 'itu', 'saja', 'cara'
]);

function calculateSimilarity(str1: string, str2: string) {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w && !STOP_WORDS.has(w));
  const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w && !STOP_WORDS.has(w));
  if (s1.length === 0 || s2.length === 0) return 0;
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

function getNextDayOfWeek(dayOfWeek: number, timeStr: string) {
  const date = new Date();
  const currentDay = date.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  date.setDate(date.getDate() + daysUntil);
  return `${date.toISOString().slice(0, 10)}T${timeStr}`;
}

// -------------------------------------------------------------
// 1. CONTENT / IDEA FORM
// -------------------------------------------------------------
interface ContentFormProps {
  initialData?: Partial<ContentItem>;
  type: 'content' | 'idea';
  onSubmit: (data: Partial<ContentItem>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function ContentForm({ initialData = {}, type, onSubmit, onCancel, onDelete }: ContentFormProps) {
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [title, setTitle] = useState(initialData.title || '');
  const [contentTier, setContentTier] = useState<ContentTier>(initialData.content_tier || 'short');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialData.aspect_ratio || (initialData.content_tier === 'long' || (initialData.content_tier as string) === 'Long-Form' ? '16:9' : '9:16')
  );
  const [pillar, setPillar] = useState<Pillar>(initialData.pillar || 'AI & Technology');
  const [format, setFormat] = useState<VideoFormat>(initialData.format || 'Quick Breakdown');
  const [status, setStatus] = useState<EditorialStatus>(initialData.status || (type === 'idea' ? 'Ide' : 'Ide'));
  const [priority, setPriority] = useState<Priority>(initialData.priority || 'Sedang');
  const [readiness, setReadiness] = useState<VisualReadiness>(initialData.visual_readiness || 'Belum dicek');
  const [hook, setHook] = useState(initialData.hook || '');
  const [sourceUrl, setSourceUrl] = useState(initialData.source_url || '');
  const [productionDue, setProductionDue] = useState(initialData.production_due || '');
  const [publishDate, setPublishDate] = useState(initialData.publish_date ? initialData.publish_date.slice(0, 16) : '');
  const [notes, setNotes] = useState(initialData.notes || '');

  const handleTierChange = (newTier: ContentTier) => {
    setContentTier(newTier);
    if (newTier === 'long' || (newTier as string) === 'Long-Form') {
      setAspectRatio('16:9');
    } else if (newTier === 'short' || (newTier as string) === 'Shorts') {
      setAspectRatio('9:16');
    }
  };

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (title.length > 10) {
      const items = studioStore.getContentItems();
      let foundDup = null;
      for (const item of items) {
        if (item.id === initialData.id) continue;
        const sim = calculateSimilarity(title, item.title);
        if (sim > 0.7) {
          foundDup = item.title;
          break;
        }
      }
      setDuplicateWarning(foundDup);
    } else {
      setDuplicateWarning(null);
    }
  }, [title, initialData.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...initialData,
      type,
      title,
      pillar,
      format,
      content_tier: contentTier,
      aspect_ratio: aspectRatio,
      status,
      priority,
      visual_readiness: readiness,
      hook,
      source_url: sourceUrl,
      production_due: productionDue || undefined,
      publish_date: publishDate ? new Date(publishDate).toISOString() : undefined,
      notes,
    });
  };

  const handlePresetSchedule = (day: number) => {
    // 1=Senin, 4=Kamis, 0=Minggu
    setPublishDate(getNextDayOfWeek(day, '07:00'));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="font-bold text-zmuted uppercase tracking-wider">
          Judul (Format Pertanyaan 5–10 Kata) *
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Misal: Kenapa AI di Ponsel Bisa Bekerja Offline?"
          className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink text-xs font-bold outline-none focus:border-zcyan"
        />
        <TitleValidatorBar title={title} />
        {duplicateWarning && (
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 mt-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-500">Peringatan Kanibalisasi Topik</h3>
              <p className="text-xs text-amber-400/90">Judul ini mirip ({'>70%'}) dengan: "{duplicateWarning}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Tier & Aspect Ratio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Content Tier *</label>
          <select
            value={contentTier}
            onChange={(e) => handleTierChange(e.target.value as ContentTier)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <option value="short">Shorts (&lt;60 detik)</option>
            <option value="mid">Mid-Form (1–3 menit)</option>
            <option value="long">Long-Form (5–8 menit)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Aspect Ratio *</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <option value="9:16">9:16 (Vertikal - Shorts / Mobile)</option>
            <option value="16:9">16:9 (Horizontal - Desktop / TV)</option>
          </select>
        </div>
      </div>

      {/* Pillar & Format */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Pilar Konten *</label>
          <select
            value={pillar}
            onChange={(e) => setPillar(e.target.value as Pillar)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <option value="Internet & Social Media">Internet & Social Media</option>
            <option value="AI & Technology">AI & Technology</option>
            <option value="Digital Economy & Consumer Culture">Digital Economy & Consumer Culture</option>
            <option value="Gaming & Digital Entertainment">Gaming & Digital Entertainment</option>
            <option value="Modern Life & Human Behavior">Modern Life & Human Behavior</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Format Video *</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as VideoFormat)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <optgroup label="Shorts (<60 detik)">
              <option value="Flash News">Flash News (20–30 detik)</option>
              <option value="Quick Breakdown">Quick Breakdown (30–45 detik)</option>
              <option value="Actionable Tip">Actionable Tip (45–60 detik)</option>
              <option value="Myth Buster">Myth Buster (30–45 detik)</option>
            </optgroup>
            <optgroup label="Mid-Form (1–3 menit)">
              <option value="Deep Explainer">Deep Explainer (1–3 menit)</option>
              <option value="Mini Tutorial">Mini Tutorial (1–3 menit)</option>
              <option value="Case Breakdown">Case Breakdown (1–3 menit)</option>
              <option value="Video Essay">Video Essay (1–3 menit)</option>
            </optgroup>
            <optgroup label="Long-Form (5–8 menit)">
              <option value="Masterclass">Masterclass (5–8 menit)</option>
              <option value="Case Investigation">Case Investigation (5–8 menit)</option>
              <option value="Ecosystem Review">Ecosystem Review (5–8 menit)</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Status & Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {type === 'content' && (
          <div className="space-y-1">
            <label className="font-semibold text-zmuted">Status Editorial</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EditorialStatus)}
              className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
            >
              <option value="Ide">Ide</option>
              <option value="Riset">Riset</option>
              <option value="Penulisan">Penulisan</option>
              <option value="Siap Produksi">Siap Produksi</option>
              <option value="Editing">Editing</option>
              <option value="Review">Review</option>
              <option value="Terjadwal">Terjadwal</option>
              <option value="Terbit">Terbit</option>
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Tingkat Prioritas</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <option value="Tinggi">Tinggi</option>
            <option value="Sedang">Sedang</option>
            <option value="Rendah">Rendah</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Kesiapan Visual</label>
          <select
            value={readiness}
            onChange={(e) => setReadiness(e.target.value as VisualReadiness)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <option value="Siap">Siap (Ada demo)</option>
            <option value="Perlu aset">Perlu Aset Tambahan</option>
            <option value="Belum dicek">Belum Dicek</option>
          </select>
        </div>
      </div>

      {/* Production Due & Publish Schedule */}
      {type === 'content' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="font-semibold text-zmuted">Tenggat Produksi</label>
            <input
              type="date"
              value={productionDue}
              onChange={(e) => setProductionDue(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-zmuted">Jadwal Tayang</label>
            <input
              type="datetime-local"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <button type="button" onClick={() => handlePresetSchedule(1)} className="px-2 py-1 bg-zpanel-2 border border-zline rounded text-[10px] font-bold text-zcyan hover:bg-zline/50">Senin 07:00</button>
              <button type="button" onClick={() => handlePresetSchedule(4)} className="px-2 py-1 bg-zpanel-2 border border-zline rounded text-[10px] font-bold text-zcyan hover:bg-zline/50">Kamis 07:00</button>
              <button type="button" onClick={() => handlePresetSchedule(0)} className="px-2 py-1 bg-zpanel-2 border border-zline rounded text-[10px] font-bold text-zcyan hover:bg-zline/50">Minggu 07:00</button>
              <button type="button" onClick={() => setPublishDate(getNextDayOfWeek(6, '19:00'))} className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-[10px] font-bold text-purple-300 hover:bg-purple-500/20">Sabtu 19:00 WIB (Long-Form Prime Time)</button>
            </div>
          </div>
        </div>
      )}

      {/* Hook preview */}
      <div className="space-y-1">
        <label className="font-semibold text-zmuted">Hook / Pembuka (0-3s Shorts, 0-15s Mid/Long)</label>
        <textarea
          rows={2}
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          placeholder="Kalimat pembuka yang memicu rasa ingin tahu..."
          className="w-full p-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      {/* Source URL & Notes */}
      <div className="space-y-1">
        <label className="font-semibold text-zmuted">URL Sumber / Inspirasi Riset</label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-zmuted">Catatan Editorial</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instruksi khusus, B-roll referensi, dsb..."
          className="w-full p-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-zline flex items-center justify-between gap-2">
        {initialData.id ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus {type === 'idea' ? 'Ide' : 'Konten'}</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-zpanel-2 border border-zline text-zmuted hover:text-zink font-semibold text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-sm"
          >
            Simpan {type === 'idea' ? 'Ide' : 'Konten'}
          </button>
        </div>
      </div>

      <ConfirmDialogModal
        isOpen={showDeleteConfirm}
        title={`Hapus ${type === 'idea' ? 'Ide' : 'Konten'}?`}
        message={`Apakah Anda yakin ingin menghapus "${title || initialData.title || ''}"? Tindakan ini dapat dibatalkan melalui notifikasi Undo.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={() => {
          if (initialData.id) {
            studioStore.deleteItem(initialData.id);
            showToast(`${type === 'idea' ? 'Ide' : 'Konten'} "${title || initialData.title}" dihapus`, 'info', true);
            if (onDelete) onDelete(initialData.id);
            setShowDeleteConfirm(false);
            onCancel();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </form>
  );
}

// -------------------------------------------------------------
// 2. RESEARCH SOURCE FORM
// -------------------------------------------------------------
interface ResearchSourceFormProps {
  initialData?: Partial<ResearchSource>;
  contentItems: ContentItem[];
  onSubmit: (data: Partial<ResearchSource>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function ResearchSourceForm({
  initialData = {},
  contentItems,
  onSubmit,
  onCancel,
  onDelete,
}: ResearchSourceFormProps) {
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [title, setTitle] = useState(initialData.source_title || '');
  const [url, setUrl] = useState(initialData.source_url || '');
  const [platform, setPlatform] = useState(initialData.source_platform || 'Dokumen Resmi Platform');
  const [pubDate, setPubDate] = useState(initialData.source_pub_date || '');
  const [checkedDate, setCheckedDate] = useState(
    initialData.source_checked_date || new Date().toISOString().slice(0, 10)
  );
  const [claim, setClaim] = useState(initialData.claim || '');
  const [evidenceQuote, setEvidenceQuote] = useState(initialData.evidence_quote || '');
  const [conclusion, setConclusion] = useState(initialData.conclusion || '');
  const [status, setStatus] = useState<VerificationStatus>(
    initialData.verification_status || 'Perlu Konfirmasi'
  );
  const [isRumor, setIsRumor] = useState(Boolean(initialData.is_rumor));
  const [contentId, setContentId] = useState(initialData.content_id || '');
  const [errorMsg, setErrorMsg] = useState('');

  const [isScraping, setIsScraping] = useState(false);

  const handleScrapeMetadata = async () => {
    if (!url) {
      setErrorMsg('Masukkan URL terlebih dahulu sebelum scrape.');
      return;
    }
    setIsScraping(true);
    try {
      const res = await fetch('/api/research/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error('Scraping failed');
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.domain) setPlatform(data.domain);
      if (data.publishedTime) {
        // basic parse to YYYY-MM-DD
        const d = new Date(data.publishedTime);
        if (!isNaN(d.getTime())) {
          setPubDate(d.toISOString().slice(0, 10));
        }
      }
      if (data.textContent) setEvidenceQuote(data.textContent.substring(0, 300) + '...');
    } catch (err: any) {
      setErrorMsg('Gagal mengambil metadata: ' + err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Strict Zeinity rule: Cannot mark 'Terverifikasi' without evidence quote and checked date!
    if (status === 'Terverifikasi') {
      if (!evidenceQuote.trim()) {
        setErrorMsg('Aturan Zeinity: Status "Terverifikasi" wajib menyertakan Kutipan Bukti.');
        return;
      }
      if (!checkedDate) {
        setErrorMsg('Aturan Zeinity: Wajib mengisi Tanggal Pemeriksaan langsung.');
        return;
      }
    }

    onSubmit({
      ...initialData,
      source_title: title,
      source_url: url,
      source_platform: platform,
      source_pub_date: pubDate || undefined,
      source_checked_date: checkedDate,
      claim,
      evidence_quote: evidenceQuote,
      conclusion,
      verification_status: status,
      is_rumor: isRumor,
      content_id: contentId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="space-y-1">
        <label className="font-bold text-zmuted uppercase tracking-wider">Judul Sumber / Dokumen *</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Misal: Google DeepMind Official Blog: On-Device NPU..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink font-bold outline-none focus:border-zcyan"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="font-semibold text-zmuted">URL Dokumen Resmi *</label>
          <div className="flex gap-2">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
            />
            <button
              type="button"
              onClick={handleScrapeMetadata}
              disabled={isScraping}
              className="px-3 py-2 bg-zcyan hover:bg-zcyan-hover text-black rounded-xl font-bold whitespace-nowrap disabled:opacity-50"
            >
              {isScraping ? 'Scraping...' : 'Scrape Metadata'}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Nama Platform / Rujukan</label>
          <input
            type="text"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="Misal: Google Blog, Meta Newsroom, dsb."
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Tgl Publikasi Sumber</label>
          <input
            type="date"
            value={pubDate}
            onChange={(e) => setPubDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Tgl Diperiksa Manusia *</label>
          <input
            type="date"
            required
            value={checkedDate}
            onChange={(e) => setCheckedDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Status Verifikasi *</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as VerificationStatus)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none font-bold"
          >
            <option value="Perlu Konfirmasi">Perlu Konfirmasi</option>
            <option value="Terverifikasi">Terverifikasi</option>
            <option value="Belum Dicek">Belum Dicek</option>
            <option value="Kedaluwarsa">Kedaluwarsa</option>
          </select>
        </div>
      </div>

      {/* Claim & Evidence */}
      <div className="space-y-1">
        <label className="font-semibold text-zmuted">Klaim Awal *</label>
        <textarea
          rows={2}
          required
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder="Klaim apa yang ingin diuji dalam naskah?"
          className="w-full p-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-emerald-400">
          Kutipan Bukti Asli (Wajib untuk Status Terverifikasi)
        </label>
        <textarea
          rows={3}
          value={evidenceQuote}
          onChange={(e) => setEvidenceQuote(e.target.value)}
          placeholder="Salin kalimat persis dari pengumuman resmi sebagai bukti tak terbantahkan..."
          className="w-full p-2.5 rounded-xl bg-zpanel-2 border border-emerald-500/40 text-zink outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-zmuted">Kesimpulan Verifikasi</label>
        <input
          type="text"
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          placeholder="Rangkuman status keabsahan fakta..."
          className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      {/* Link to Content Item */}
      <div className="space-y-1">
        <label className="font-semibold text-zmuted">Hubungkan ke Video Content</label>
        <select
          value={contentId}
          onChange={(e) => setContentId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        >
          <option value="">(Belum dihubungkan ke video manapun)</option>
          {contentItems
            .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
            .map((c, idx) => (
            <option key={`${c.id}-${idx}`} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Rumor flag checkbox */}
      <label className="flex items-center gap-2 text-xs text-rose-300 font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={isRumor}
          onChange={(e) => setIsRumor(e.target.checked)}
          className="rounded border-zline text-rose-500"
        />
        <span>Tandai sebagai isu rumor / belum ada rilis resmi dari pengembang</span>
      </label>

      {/* Buttons */}
      <div className="pt-3 border-t border-zline flex items-center justify-between gap-2">
        {initialData.id ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Sumber</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-zpanel-2 border border-zline text-zmuted hover:text-zink font-semibold text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-sm"
          >
            Simpan Sumber Riset
          </button>
        </div>
      </div>

      <ConfirmDialogModal
        isOpen={showDeleteConfirm}
        title="Hapus Sumber Riset?"
        message={`Apakah Anda yakin ingin menghapus sumber "${title || initialData.source_title || ''}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={() => {
          if (initialData.id) {
            studioStore.deleteSource(initialData.id);
            showToast(`Sumber "${title || initialData.source_title}" dihapus`, 'info');
            if (onDelete) onDelete(initialData.id);
            setShowDeleteConfirm(false);
            onCancel();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </form>
  );
}

// -------------------------------------------------------------
// 3. MEDIA ASSET FORM
// -------------------------------------------------------------
interface MediaAssetFormProps {
  initialData?: Partial<MediaAsset>;
  contentItems: ContentItem[];
  onSubmit: (data: Partial<MediaAsset>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function MediaAssetForm({
  initialData = {},
  contentItems,
  onSubmit,
  onCancel,
  onDelete,
}: MediaAssetFormProps) {
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState(initialData.asset_name || '');
  const [type, setType] = useState<AssetType>(initialData.asset_type || 'Screen recording');
  const [url, setUrl] = useState(initialData.asset_url || '');
  const [storagePath, setStoragePath] = useState(initialData.storage_path || '');
  const [tagsStr, setTagsStr] = useState((initialData.asset_tags || []).join(', '));
  const [contentId, setContentId] = useState(initialData.content_id || '');

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    // Auto-detect asset type from mime
    if (file.type.startsWith('video/')) {
      const lower = file.name.toLowerCase();
      setType(lower.includes('broll') || lower.includes('b-roll') ? 'B-roll' : 'Screen recording');
    } else if (file.type.startsWith('audio/')) {
      setType('Audio');
    } else if (file.type.startsWith('image/')) {
      const lower = file.name.toLowerCase();
      setType(lower.includes('thumb') ? 'Thumbnail frame' : 'Screenshot');
    } else {
      setType('Document');
    }

    if (!name || name === '') {
      setName(file.name);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Gagal mengunggah file');
      }

      setUrl(data.url);
      setStoragePath(
        data.storage === 'supabase'
          ? `zeinity-assets/${data.filename || file.name}`
          : `local-cache/${file.name}`
      );
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat mengunggah file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      ...initialData,
      asset_name: name,
      asset_type: type,
      asset_url: url,
      storage_path: storagePath || `zeinity-assets/${name}`,
      asset_tags: tags,
      content_id: contentId || undefined,
      asset_status: 'Ready',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {/* Drag and drop upload zone */}
      <div className="space-y-1.5">
        <label className="font-bold text-zmuted uppercase tracking-wider">
          Upload File Fisik Media
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-zcyan bg-zcyan/10 scale-[0.99]'
              : 'border-zline hover:border-zaccent/60 bg-zpanel-2/70 hover:bg-zpanel-2'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />

          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <Loader2 className="w-7 h-7 text-zcyan animate-spin" />
              <span className="text-xs font-bold text-zink">
                Mengunggah & memproses file media...
              </span>
              <span className="text-[10px] text-zmuted">
                Menyimpan ke Supabase Storage / Cache Lokal Base64
              </span>
            </div>
          ) : url ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              {type === 'Screenshot' || type === 'Thumbnail frame' || url.startsWith('data:image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt="Asset Preview"
                  className="max-h-36 rounded-lg object-contain border border-zline shadow-sm"
                />
              ) : type === 'Audio' || url.startsWith('data:audio/') ? (
                <div className="flex items-center gap-2 text-zpink">
                  <Music className="w-6 h-6" />
                  <span className="text-xs font-semibold">Audio siap</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zcyan">
                  <Film className="w-6 h-6" />
                  <span className="text-xs font-semibold">Video / Berkas siap</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>File berhasil dimuat</span>
              </div>
              <span className="text-[10px] text-zmuted hover:text-zcyan underline">
                Klik atau tarik file lain untuk mengganti
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-3 space-y-1.5">
              <UploadCloud className="w-8 h-8 text-zmuted/80 group-hover:text-zcyan" />
              <div className="text-xs font-bold text-zink">
                Tarik & lepas file ke sini, atau{' '}
                <span className="text-zcyan underline">telusuri file</span>
              </div>
              <div className="text-[10px] text-zmuted">
                Mendukung Screen recording 1080p, Screenshot, B-roll, Voiceover Audio (MP3/WAV), atau Gambar
              </div>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="font-bold text-zmuted uppercase tracking-wider">Nama File Aset *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Misal: demo-airplane-mode-summary.mp4"
          className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink font-bold outline-none focus:border-zcyan"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Tipe Aset *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <option value="Screen recording">Screen recording (1080×1920)</option>
            <option value="Screenshot">Screenshot Antarmuka</option>
            <option value="B-roll">B-roll Video</option>
            <option value="Audio">Audio Voiceover</option>
            <option value="Thumbnail frame">Thumbnail Frame</option>
            <option value="Document">Dokumen Pengumuman</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Hubungkan ke Konten</label>
          <select
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <option value="">(Belum dihubungkan)</option>
            {contentItems
              .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
              .map((c, idx) => (
              <option key={`${c.id}-${idx}`} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-zmuted">URL Aset / Cloud Storage</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://... atau data:... atau storage-path"
          className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-zmuted">Tag Aset (Pisahkan dengan koma)</label>
        <input
          type="text"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="AI, Demo, Settings, 1080p"
          className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      <div className="pt-3 border-t border-zline flex items-center justify-between gap-2">
        {initialData.id ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Aset</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-zpanel-2 border border-zline text-zmuted hover:text-zink font-semibold text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-sm"
          >
            Simpan Aset
          </button>
        </div>
      </div>

      <ConfirmDialogModal
        isOpen={showDeleteConfirm}
        title="Hapus Metadata Aset?"
        message={`Apakah Anda yakin ingin menghapus metadata aset "${name || initialData.asset_name || ''}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={() => {
          if (initialData.id) {
            studioStore.deleteAsset(initialData.id);
            showToast(`Aset "${name || initialData.asset_name}" dihapus`, 'info');
            if (onDelete) onDelete(initialData.id);
            setShowDeleteConfirm(false);
            onCancel();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </form>
  );
}

// -------------------------------------------------------------
// 4. ANALYTICS METRIC FORM
// -------------------------------------------------------------
interface MetricFormProps {
  initialData?: Partial<AnalyticsMetric>;
  onSubmit: (data: Partial<AnalyticsMetric>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function MetricForm({ initialData = {}, onSubmit, onCancel, onDelete }: MetricFormProps) {
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [title, setTitle] = useState(initialData.title || '');
  const [tier, setTier] = useState<ContentTier>(initialData.content_tier || 'short');
  const [thumbnailCtr, setThumbnailCtr] = useState<number | ''>(
    initialData.thumbnail_ctr !== undefined ? initialData.thumbnail_ctr : ''
  );
  const [views, setViews] = useState(initialData.views || 0);
  const [feed, setFeed] = useState(initialData.shown_in_feed || 0);
  const [stayed, setStayed] = useState(initialData.stayed_to_watch || 70.0);
  const [apv, setApv] = useState(initialData.apv || 95.0);
  const [avgDur, setAvgDur] = useState(initialData.avg_view_duration || 45.0);
  const [hypothesis, setHypothesis] = useState(initialData.experiment_hypothesis || '');
  const [result, setResult] = useState(initialData.experiment_result || '');
  const [nextAction, setNextAction] = useState(initialData.experiment_next || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...initialData,
      title,
      content_tier: tier,
      thumbnail_ctr: thumbnailCtr !== '' ? Number(thumbnailCtr) : undefined,
      views: Number(views),
      shown_in_feed: Number(feed),
      stayed_to_watch: Number(stayed),
      apv: Number(apv),
      avg_view_duration: Number(avgDur),
      experiment_hypothesis: hypothesis,
      experiment_result: result,
      experiment_next: nextAction,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1">
        <label className="font-bold text-zmuted uppercase tracking-wider">Judul Video *</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul video YouTube Shorts..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink font-bold outline-none focus:border-zcyan"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Content Tier</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as ContentTier)}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          >
            <option value="short">Shorts (&lt;60 detik)</option>
            <option value="mid">Mid-Form (1–3 menit)</option>
            <option value="long">Long-Form (5–8 menit)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-purple-400">CTR Thumbnail (%)</label>
          <input
            type="number"
            step="0.1"
            value={thumbnailCtr}
            onChange={(e) => setThumbnailCtr(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Misal: 6.8% (Target: 5–8%)"
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-purple-500/40 text-purple-300 font-bold outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Views</label>
          <input
            type="number"
            value={views}
            onChange={(e) => setViews(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zmuted">Shown in Feed</label>
          <input
            type="number"
            value={feed}
            onChange={(e) => setFeed(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-emerald-400">Viewed % (≥ 70%)</label>
          <input
            type="number"
            step="0.1"
            value={stayed}
            onChange={(e) => setStayed(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-emerald-500/40 text-emerald-300 font-bold outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-zcyan">APV % (90–110%)</label>
          <input
            type="number"
            step="0.1"
            value={apv}
            onChange={(e) => setApv(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zcyan/40 text-zcyan font-bold outline-none"
          />
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="font-semibold text-zmuted">Rata-rata Durasi (Detik)</label>
          <input
            type="number"
            step="0.1"
            value={avgDur}
            onChange={(e) => setAvgDur(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-amber-400">Hipotesis Eksperimen</label>
        <textarea
          rows={2}
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="Variabel apa yang sedang diuji pada video ini (misal teks overlay kuning)..."
          className="w-full p-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-zmuted">Hasil & Temuan</label>
        <textarea
          rows={2}
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="Bagaimana pengaruhnya terhadap retensi audiens..."
          className="w-full p-2.5 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="font-semibold text-zmuted">Langkah untuk Video Berikutnya</label>
        <input
          type="text"
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="Terapkan temuan ke format video selanjutnya..."
          className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
        />
      </div>

      <div className="pt-3 border-t border-zline flex items-center justify-between gap-2">
        {initialData.id ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Metrik</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-zpanel-2 border border-zline text-zmuted hover:text-zink font-semibold text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-sm"
          >
            Simpan Metrik
          </button>
        </div>
      </div>

      <ConfirmDialogModal
        isOpen={showDeleteConfirm}
        title="Hapus Metrik Video?"
        message={`Apakah Anda yakin ingin menghapus data analitik "${title || initialData.title || ''}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={() => {
          if (initialData.id) {
            studioStore.deleteMetric(initialData.id);
            showToast(`Metrik "${title || initialData.title}" dihapus`, 'info');
            if (onDelete) onDelete(initialData.id);
            setShowDeleteConfirm(false);
            onCancel();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </form>
  );
}
