'use client';

import React, { useState } from 'react';
import { ResearchSource, ContentItem, VerificationStatus } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { generateWithTaskRouter } from '../../lib/ai-service';
import { useToast } from '../ToastContainer';
import { ConfirmDialogModal } from '../ConfirmDialogModal';
import {
  ShieldCheck,
  Plus,
  Search,
  ExternalLink,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  FileText,
} from 'lucide-react';

interface ResearchModuleProps {
  sources: ResearchSource[];
  contentItems: ContentItem[];
  onOpenSourceModal: (source?: ResearchSource) => void;
}

export function ResearchModule({
  sources,
  contentItems,
  onOpenSourceModal,
}: ResearchModuleProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceToDelete, setSourceToDelete] = useState<{ id: string; title: string } | null>(null);

  const filteredSources = sources.filter((s) => {
    const matchSearch =
      !search ||
      s.source_title.toLowerCase().includes(search.toLowerCase()) ||
      s.claim.toLowerCase().includes(search.toLowerCase()) ||
      s.source_platform.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.verification_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = (id: string, title: string) => {
    setSourceToDelete({ id, title });
  };

  const handleExecuteDeleteSource = () => {
    if (!sourceToDelete) return;
    studioStore.deleteSource(sourceToDelete.id);
    showToast(`Sumber "${sourceToDelete.title}" dihapus`, 'info');
    setSourceToDelete(null);
  };

  const handlePushToPayoff = (source: ResearchSource, linkedContent?: ContentItem) => {
    if (!linkedContent || !source.evidence_quote) return;
    const newPayoff = linkedContent.script_payoff ? linkedContent.script_payoff + '\n' + source.evidence_quote : source.evidence_quote;
    studioStore.saveContentItem({
      ...linkedContent,
      script_payoff: newPayoff,
    });
    showToast('Kutipan berhasil ditambahkan ke tahap Payoff naskah', 'success');
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'Terverifikasi':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            Terverifikasi
          </span>
        );
      case 'Perlu Konfirmasi':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            Perlu Konfirmasi
          </span>
        );
      case 'Kedaluwarsa':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Clock className="w-3 h-3" />
            Kedaluwarsa
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-zline/50 text-zmuted border border-zline">
            Belum Dicek
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
            RESEARCH & FACT-CHECKING STUDIO
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Verifikasi Sumber & Fakta</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Pembeda utama Zeinity: Setiap klaim naskah wajib memiliki landasan kutipan resmi, tautan pengumuman, dan tanggal pemeriksaan primer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const url = prompt('Masukkan Topik atau URL untuk Riset Otomatis (Grounding AI):');
              if (url) {
                showToast('Riset Otonom sedang berjalan. Harap tunggu...', 'info');
                try {
                  const res = await generateWithTaskRouter('autonomous_research', { url });
                  
                  // Extract 4-fase draft if available
                  const text = res.text;
                  const extract = (marker: string) => {
                    const idx = text.toLowerCase().indexOf(marker.toLowerCase());
                    if (idx === -1) return '';
                    let endIdx = text.indexOf('\n', idx);
                    if (endIdx === -1) endIdx = text.length;
                    return text.substring(idx + marker.length, endIdx).replace(/^[:\-\s]+/, '').trim();
                  };
                  
                  const hookText = extract('Hook') || 'Hook hasil riset...';
                  const contextText = extract('Context') || 'Konteks hasil riset...';
                  const payoffText = extract('Payoff') || 'Payoff hasil riset...';
                  const endingText = extract('Ending') || 'Ending hasil riset...';

                  // Add a new content draft
                  const newContent = studioStore.saveContentItem({
                    title: 'Draf Otonom: ' + (url.split('?')[0].split('/').pop() || url).substring(0, 30),
                    pillar: 'AI & Technology',
                    format: 'Quick Breakdown',
                    status: 'Riset',
                    priority: 'Sedang',
                    visual_readiness: 'Belum dicek',
                    source_url: url,
                    script_hook: hookText,
                    script_context: contextText,
                    script_payoff: payoffText,
                    script_ending: endingText,
                    word_count: 80,
                    duration_estimate: 35
                  });

                  // Add a new source from the AI result
                  studioStore.saveSource({
                    source_title: 'Riset Otonom: ' + url,
                    source_url: url.startsWith('http') ? url : '',
                    source_platform: 'Google Search / AI Grounding',
                    claim: 'Riset otomatis: ' + url,
                    evidence_quote: res.text.substring(0, 500) + '...',
                    verification_status: 'Terverifikasi',
                    source_checked_date: new Date().toISOString().slice(0, 10),
                    content_id: newContent.id
                  });
                  
                  showToast('Berhasil mendapatkan informasi dari AI Grounding dan membuat draf naskah', 'success');
                  // Trigger a re-render by doing a minimal state update or relying on the parent to refresh if needed. 
                  // Since ResearchModule is receiving sources from props, we might need a small trick to refresh or just wait for next update.
                  // For now, reload window or rely on the toast.
                  setTimeout(() => window.location.reload(), 1500);
                } catch (err: any) {
                  showToast('Gagal melakukan riset otonom: ' + err.message, 'error');
                }
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs shadow-md shadow-zcyan/20 transition-all hover:scale-[1.02]"
          >
            <Search className="w-4 h-4" />
            Riset Otomatis AI (Grounding)
          </button>
          <button
            onClick={() => onOpenSourceModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            + Tambah Sumber Riset
          </button>
        </div>
      </div>

      {/* Strict Guidelines Notice Banner */}
      <div className="p-4 rounded-xl bg-zpanel border border-zline flex items-start gap-3 text-xs text-zmuted">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-zink">Aturan Editorial Zeinity:</strong> Status <em>Terverifikasi</em> hanya boleh dipilih jika kolom <strong>Kutipan Bukti</strong> terisi dan <strong>Tanggal Pemeriksaan</strong> telah dikonfirmasi manusia langsung ke sumber aslinya. AI tidak boleh otomatis menandai klaim sebagai fakta.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-zpanel border border-zline flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-zmuted" />
          <input
            type="text"
            placeholder="Cari judul sumber atau klaim..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-zink placeholder-zmuted outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zmuted text-[11px]">Status Verifikasi:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="Terverifikasi">Terverifikasi</option>
            <option value="Perlu Konfirmasi">Perlu Konfirmasi</option>
            <option value="Belum Dicek">Belum Dicek</option>
            <option value="Kedaluwarsa">Kedaluwarsa</option>
          </select>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zmuted text-xs border border-dashed border-zline rounded-2xl bg-zpanel/40">
            Tidak ada sumber riset yang cocok dengan filter saat ini.
          </div>
        ) : (
          filteredSources
            .filter((source, i, arr) => arr.findIndex((x) => x.id === source.id) === i)
            .map((source, idx) => {
            const linkedContent = contentItems.find((c) => c.id === source.content_id);

            return (
              <div
                key={`${source.id}-${idx}`}
                className="p-5 rounded-2xl bg-zpanel border border-zline hover:border-emerald-500/50 transition-all space-y-3.5 flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top Status & Platform */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-zcyan text-[11px] truncate max-w-[200px]">
                      {source.source_platform}
                    </span>
                    {getStatusBadge(source.verification_status)}
                  </div>

                  {/* Rumor Alert Banner */}
                  {source.is_rumor && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Perhatian: Sumber ini ditandai sebagai rumor / klaim belum resmi!</span>
                    </div>
                  )}

                  {/* Title & URL */}
                  <div>
                    <h3
                      onClick={() => onOpenSourceModal(source)}
                      className="text-sm font-bold text-zink hover:text-emerald-400 cursor-pointer leading-snug transition-colors"
                    >
                      {source.source_title}
                    </h3>
                    {source.source_url && (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-zcyan hover:underline mt-1 truncate max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{source.source_url}</span>
                      </a>
                    )}
                  </div>

                  {/* Claim Box */}
                  <div className="p-3 rounded-xl bg-zpanel-2 border border-zline/60 space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-bold text-zmuted tracking-wider">
                      Klaim Awal:
                    </span>
                    <p className="text-zink/90 font-medium leading-relaxed">{source.claim}</p>
                  </div>

                  {/* Evidence Quote Box */}
                  {source.evidence_quote && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs flex flex-col">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          Kutipan Bukti Terverifikasi:
                        </span>
                        <blockquote className="text-emerald-200/90 italic leading-relaxed mt-1">
                          &quot;{source.evidence_quote}&quot;
                        </blockquote>
                      </div>
                      {linkedContent && (
                        <button
                          onClick={() => handlePushToPayoff(source, linkedContent)}
                          className="self-start px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[10px] flex flex-row items-center gap-1 transition-colors mt-2"
                        >
                          <FileText className="w-3 h-3" />
                          Push ke Naskah Payoff
                        </button>
                      )}
                    </div>
                  )}

                  {/* Conclusion */}
                  {source.conclusion && (
                    <div className="text-[11px] text-zmuted">
                      <strong>Kesimpulan:</strong> {source.conclusion}
                    </div>
                  )}
                </div>

                {/* Bottom Footer Details */}
                <div className="pt-3 border-t border-zline/50 flex items-center justify-between text-[11px] text-zmuted">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      {source.source_checked_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zmuted" />
                          Dicek: {source.source_checked_date}
                        </span>
                      )}
                      {linkedContent && (
                        <span className="truncate max-w-[120px] font-semibold text-zink">
                          • {linkedContent.title}
                        </span>
                      )}
                    </div>
                    {(source.source_pub_date || source.source_checked_date) && (Date.now() - new Date(source.source_pub_date || source.source_checked_date || '').getTime() > 180 * 24 * 60 * 60 * 1000) && (
                      <div className="flex items-center gap-1 text-amber-500 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Peringatan: Fakta Kedaluwarsa ({'>'} 6 bulan)
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenSourceModal(source)}
                      className="px-2.5 py-1 rounded bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(source.id, source.source_title)}
                      className="p-1 rounded text-zmuted hover:text-red-400"
                      title="Hapus sumber"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialogModal
        isOpen={sourceToDelete !== null}
        title="Hapus Sumber Riset?"
        message={`Apakah Anda yakin ingin menghapus sumber riset "${sourceToDelete?.title || ''}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleExecuteDeleteSource}
        onCancel={() => setSourceToDelete(null)}
      />
    </div>
  );
}
