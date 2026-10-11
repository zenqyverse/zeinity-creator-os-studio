'use client';

import React, { useState } from 'react';
import { AnalyticsMetric, ContentItem, Pillar, VideoFormat } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import { ConfirmDialogModal } from '../ConfirmDialogModal';
import { generateWithTaskRouter } from '../../lib/ai-service';
import {
  TrendingUp,
  Plus,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  BarChart2,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
} from 'lucide-react';

import { parseYouTubeAnalyticsCsv } from '../../lib/csv-parser';

const PILLARS: Pillar[] = [
  'AI & Technology',
  'Internet & Social Media',
  'Digital Economy & Consumer Culture',
  'Gaming & Digital Entertainment',
  'Modern Life & Human Behavior',
];

const FORMATS: VideoFormat[] = [
  // Shorts (4)
  'Flash News',
  'Quick Breakdown',
  'Actionable Tip',
  'Myth Buster',
  // Mid-Form (4)
  'Deep Explainer',
  'Mini Tutorial',
  'Case Breakdown',
  'Video Essay',
  // Long-Form (3)
  'Masterclass',
  'Case Investigation',
  'Ecosystem Review',
];

export function inferFormatTier(format: VideoFormat): 'Shorts' | 'Mid-Form' | 'Long-Form' {
  if (['Flash News', 'Quick Breakdown', 'Actionable Tip', 'Myth Buster'].includes(format)) return 'Shorts';
  if (['Deep Explainer', 'Mini Tutorial', 'Case Breakdown', 'Video Essay'].includes(format)) return 'Mid-Form';
  return 'Long-Form';
}

export function evaluateMetricBenchmark(m: AnalyticsMetric) {
  const rawTier = (m.content_tier || '').toLowerCase();
  const format = m.format;
  const dur = m.avg_view_duration;

  let tier: 'Shorts' | 'Mid-Form' | 'Long-Form' = 'Shorts';
  if (
    rawTier.includes('long') ||
    format === 'Masterclass' ||
    format === 'Case Investigation' ||
    format === 'Ecosystem Review' ||
    dur > 300
  ) {
    tier = 'Long-Form';
  } else if (
    rawTier.includes('mid') ||
    format === 'Deep Explainer' ||
    format === 'Mini Tutorial' ||
    format === 'Case Breakdown' ||
    format === 'Video Essay' ||
    (dur > 60 && dur <= 300)
  ) {
    tier = 'Mid-Form';
  }

  const apv = Number(m.apv);
  const stayed = Number(m.stayed_to_watch);
  const ctr = m.thumbnail_ctr !== undefined ? Number(m.thumbnail_ctr) : undefined;

  if (tier === 'Long-Form') {
    // Long-Form: Evaluasi APV (40-60% Optimal) dan CTR Thumbnail (5-8% Optimal, >8% Top Performer)
    const isApvOptimal = apv >= 40 && apv <= 60;
    const isApvHigh = apv > 60;
    const apvPassed = isApvOptimal || isApvHigh;
    const apvStatus = isApvOptimal ? 'Optimal (40–60%)' : isApvHigh ? 'Tinggi (>60%)' : 'Rendah (<40%)';

    const isCtrTop = ctr !== undefined && ctr > 8;
    const isCtrOptimal = ctr !== undefined && ctr >= 5 && ctr <= 8;
    const ctrPassed = isCtrTop || isCtrOptimal;
    const ctrStatus = isCtrTop
      ? 'Top Performer (>8%)'
      : isCtrOptimal
      ? 'Optimal (5–8%)'
      : ctr !== undefined
      ? 'Di Bawah 5%'
      : 'Belum Ada CTR';

    const isOverallOptimal = (apvPassed && ctrPassed) || isCtrTop;

    return {
      tier,
      isShorts: false,
      primaryName: 'APV % (40–60%)',
      primaryVal: `${apv}%`,
      primaryPassed: apvPassed,
      primaryStatus: apvStatus,
      secondaryName: 'CTR Thumbnail (5–8%)',
      secondaryVal: ctr !== undefined ? `${ctr}%` : '—',
      secondaryPassed: ctrPassed,
      secondaryStatus: ctrStatus,
      isOverallOptimal,
      overallStatus: isCtrTop ? 'Top Performer' : isOverallOptimal ? 'Optimal' : 'Perlu Optimasi',
      overallClass: isCtrTop
        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
        : isOverallOptimal
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  } else if (tier === 'Mid-Form') {
    // Mid-Form: APV 60-80% Optimal, CTR 4-7% Optimal
    const isApvOptimal = apv >= 60 && apv <= 80;
    const isApvHigh = apv > 80;
    const apvPassed = isApvOptimal || isApvHigh;
    const apvStatus = isApvOptimal ? 'Optimal (60–80%)' : isApvHigh ? 'Tinggi (>80%)' : 'Rendah (<60%)';

    const isCtrTop = ctr !== undefined && ctr > 7;
    const isCtrOptimal = ctr !== undefined && ctr >= 4 && ctr <= 7;
    const ctrPassed = isCtrTop || isCtrOptimal;
    const ctrStatus = isCtrTop
      ? 'Top Performer (>7%)'
      : isCtrOptimal
      ? 'Optimal (4–7%)'
      : ctr !== undefined
      ? 'Di Bawah 4%'
      : 'Belum Ada CTR';

    const isOverallOptimal = apvPassed && (ctr === undefined || ctrPassed);

    return {
      tier,
      isShorts: false,
      primaryName: 'APV % (60–80%)',
      primaryVal: `${apv}%`,
      primaryPassed: apvPassed,
      primaryStatus: apvStatus,
      secondaryName: 'CTR Thumbnail (4–7%)',
      secondaryVal: ctr !== undefined ? `${ctr}%` : '—',
      secondaryPassed: ctrPassed,
      secondaryStatus: ctrStatus,
      isOverallOptimal,
      overallStatus: isCtrTop ? 'Top Performer' : isOverallOptimal ? 'Optimal' : 'Perlu Optimasi',
      overallClass: isCtrTop
        ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
        : isOverallOptimal
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  } else {
    // Shorts: Stayed >= 70% dan APV 90-110% adalah Optimal
    const viewedPassed = stayed >= 70;
    const apvPassed = apv >= 90 && apv <= 110;
    const isOverallOptimal = viewedPassed && apvPassed;

    return {
      tier: 'Shorts' as const,
      isShorts: true,
      primaryName: 'Viewed % (≥ 70%)',
      primaryVal: `${stayed}%`,
      primaryPassed: viewedPassed,
      primaryStatus: viewedPassed ? 'Optimal (≥70%)' : 'Di Bawah Target',
      secondaryName: 'APV % (90–110%)',
      secondaryVal: `${apv}%`,
      secondaryPassed: apvPassed,
      secondaryStatus: apvPassed ? 'Optimal (90–110%)' : 'Di Luar Target',
      isOverallOptimal,
      overallStatus: isOverallOptimal ? 'Optimal' : 'Perlu Optimasi',
      overallClass: isOverallOptimal
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
  }
}

interface AnalyticsModuleProps {
  metrics: AnalyticsMetric[];
  contentItems: ContentItem[];
  onOpenMetricModal: (metric?: AnalyticsMetric) => void;
}

export function AnalyticsModule({
  metrics,
  contentItems,
  onOpenMetricModal,
}: AnalyticsModuleProps) {
  const { showToast } = useToast();
  const [metricToDelete, setMetricToDelete] = useState<AnalyticsMetric | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  // CSV file input trigger
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedRows = parseYouTubeAnalyticsCsv(text);
        if (parsedRows.length === 0) {
          showToast('File CSV tidak memiliki baris data video valid atau format tidak sesuai', 'error');
          return;
        }

        // Save each parsed row into studioStore
        let savedCount = 0;
        for (const row of parsedRows) {
          studioStore.saveMetric(row);
          savedCount++;
        }

        showToast(`Berhasil mengimpor ${savedCount} data performa video dari file CSV!`, 'success');
      } catch (err: any) {
        showToast(`Format CSV tidak dikenali: ${err.message || 'Error'}`, 'error');
      }
    };
    reader.readAsText(file);
    // Reset input value so same file can be re-uploaded if modified
    e.target.value = '';
  };

  const handleRunAiInsight = async () => {
    setIsAiLoading(true);
    try {
      const res = await generateWithTaskRouter('retention_insight', {});
      setAiInsight(res.text);
      showToast('AI Evaluasi Retensi selesai dibuat', 'info');
    } catch {
      showToast('Gagal memproses AI insight', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Compute overall average benchmarks
  const avgViewed =
    metrics.length > 0
      ? Math.round(
          (metrics.reduce((acc, m) => acc + Number(m.stayed_to_watch), 0) / metrics.length) * 10
        ) / 10
      : 72.0;

  const avgApv =
    metrics.length > 0
      ? Math.round(
          (metrics.reduce((acc, m) => acc + Number(m.apv), 0) / metrics.length) * 10
        ) / 10
      : 98.0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            ANALYTICS & LEARNING CENTER
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Evaluasi Performa & Riset Retensi</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Tolok ukur keberhasilan Zeinity: Target <strong>Viewed ≥ 70%</strong> dan <strong>APV 90%–110%</strong>. Eksperimen terarah menghasilkan konten berikutnya yang makin presisi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync from YouTube Channel button */}
          <button
            disabled={isAiLoading}
            onClick={async () => {
              try {
                setIsAiLoading(true);
                showToast('Menyinkronkan metrik dari YouTube...', 'info');
                const res = await fetch('/api/youtube/analytics', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contentItems }),
                });
                const data = await res.json();
                if (data.ok && data.metrics) {
                  let savedCount = 0;
                  for (const metric of data.metrics) {
                    studioStore.saveMetric(metric);
                    savedCount++;
                  }
                  showToast(`Berhasil menyinkronkan ${savedCount} video dari YouTube!`, 'success');
                } else {
                  showToast(data.error || 'Gagal menyinkronkan metrik', 'error');
                }
              } catch (err: any) {
                showToast(`Gagal: ${err.message}`, 'error');
              } finally {
                setIsAiLoading(false);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-xs font-semibold text-rose-400 cursor-pointer transition-colors disabled:opacity-50"
          >
            {isAiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Sinkronkan dari YouTube Channel</span>
          </button>

          {/* CSV file upload button */}
          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-zaccent" />
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => onOpenMetricModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zaccent hover:bg-zaccent-hover text-black font-bold text-xs shadow-md shadow-zaccent/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            + Input Metrik
          </button>
        </div>

      </div>

      {/* 2 Benchmark Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Benchmark 1: Viewed vs Swiped */}
        <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-2">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-bold uppercase tracking-wider text-[11px]">
              Target 1 · Viewed vs Swiped Away
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                avgViewed >= 70
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              Target Baku: ≥ 70%
            </span>
          </div>
          <div className="text-4xl font-black text-emerald-400">{avgViewed}%</div>
          <p className="text-xs text-zmuted leading-relaxed">
            Rata-rata audiens yang memilih untuk menonton video Zeinity dibanding menggeser (swiped away) pada 3 detik awal.
          </p>
        </div>

        {/* Benchmark 2: APV */}
        <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-2">
          <div className="flex items-center justify-between text-xs text-zmuted">
            <span className="font-bold uppercase tracking-wider text-[11px]">
              Target 2 · Average Percentage Viewed (APV)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                avgApv >= 90 && avgApv <= 110
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              Target Baku: 90% – 110%
            </span>
          </div>
          <div className="text-4xl font-black text-zcyan">{avgApv}%</div>
          <p className="text-xs text-zmuted leading-relaxed">
            Menunjukkan seberapa tuntas video ditonton. Angka di atas 100% menandakan sebagian penonton melakukan replay (seamless looping berhasil).
          </p>
        </div>
      </div>

      {/* AI Performance Insights Banner */}
      <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zpink" />
            <h3 className="text-sm font-bold text-zink">AI Retention & Experiment Insights</h3>
          </div>
          <button
            disabled={isAiLoading}
            onClick={handleRunAiInsight}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zpink/20 hover:bg-zpink/30 border border-zpink/40 text-zpink text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isAiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Evaluasi Pola Retensi
          </button>
        </div>

        {aiInsight ? (
          <div className="p-4 rounded-xl bg-zpanel-2 border border-zline text-xs text-zink/90 leading-relaxed font-sans whitespace-pre-wrap animate-in fade-in-50">
            {aiInsight}
          </div>
        ) : (
          <p className="text-xs text-zmuted">
            Klik tombol di atas untuk menganalisis korelasi gaya teks visual pada detik 0-3 terhadap lonjakan retensi penonton.
          </p>
        )}
      </div>

      {/* 5 Pillars Retention Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-zcyan" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zink">
              Rincian Retensi Berdasarkan 5 Pilar Konten
            </h3>
          </div>
          <span className="text-[11px] text-zmuted">Tolok Ukur: Viewed ≥70% · APV 90–110%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PILLARS.map((p, idx) => {
            const items = metrics.filter((m) => m.pillar === p);
            const count = items.length;
            const pAvgViewed =
              count > 0
                ? Math.round((items.reduce((s, m) => s + Number(m.stayed_to_watch), 0) / count) * 10) / 10
                : null;
            const pAvgApv =
              count > 0
                ? Math.round((items.reduce((s, m) => s + Number(m.apv), 0) / count) * 10) / 10
                : null;

            const viewedPassed = pAvgViewed !== null && pAvgViewed >= 70;
            const apvPassed = pAvgApv !== null && pAvgApv >= 90 && pAvgApv <= 110;

            return (
              <div
                key={`${p}-${idx}`}
                className="p-4 rounded-xl bg-zpanel border border-zline hover:border-zcyan/40 transition-all space-y-2.5 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="text-[11px] font-bold text-zink line-clamp-1" title={p}>
                    {p}
                  </div>
                  <div className="text-[10px] text-zmuted mt-0.5">{count} video dievaluasi</div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zline/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zmuted">Viewed:</span>
                    <span
                      className={`font-black text-xs ${
                        pAvgViewed === null
                          ? 'text-zmuted'
                          : viewedPassed
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {pAvgViewed !== null ? `${pAvgViewed}%` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zmuted">APV:</span>
                    <span
                      className={`font-black text-xs ${
                        pAvgApv === null
                          ? 'text-zmuted'
                          : apvPassed
                          ? 'text-zcyan'
                          : 'text-amber-400'
                      }`}
                    >
                      {pAvgApv !== null ? `${pAvgApv}%` : '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-zline/30 flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      count === 0
                        ? 'bg-zpanel-2 text-zmuted'
                        : viewedPassed && apvPassed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : viewedPassed || apvPassed
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {count === 0 ? 'Belum Ada Data' : viewedPassed && apvPassed ? 'Target Tercapai' : 'Perlu Optimasi'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 11 Formats Retention Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zpink" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zink">
              Rincian Retensi Berdasarkan 11 Format Video
            </h3>
          </div>
          <span className="text-[11px] text-zmuted">Evaluasi Struktur Naskah, Pacing & CTR Thumbnail</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {FORMATS.map((f, idx) => {
            const items = metrics.filter((m) => m.format === f);
            const count = items.length;
            const fTier = inferFormatTier(f);
            const fAvgViewed =
              count > 0
                ? Math.round((items.reduce((s, m) => s + Number(m.stayed_to_watch), 0) / count) * 10) / 10
                : null;
            const fAvgApv =
              count > 0
                ? Math.round((items.reduce((s, m) => s + Number(m.apv), 0) / count) * 10) / 10
                : null;
            const itemsWithCtr = items.filter((m) => m.thumbnail_ctr !== undefined);
            const fAvgCtr =
              itemsWithCtr.length > 0
                ? Math.round((itemsWithCtr.reduce((s, m) => s + Number(m.thumbnail_ctr), 0) / itemsWithCtr.length) * 10) / 10
                : null;

            let isTargetPassed = false;
            let targetLabel = '';
            if (fTier === 'Shorts') {
              const viewedPassed = fAvgViewed !== null && fAvgViewed >= 70;
              const apvPassed = fAvgApv !== null && fAvgApv >= 90 && fAvgApv <= 110;
              isTargetPassed = viewedPassed && apvPassed;
              targetLabel = 'Viewed ≥70% · APV 90–110%';
            } else if (fTier === 'Mid-Form') {
              const apvPassed = fAvgApv !== null && fAvgApv >= 60;
              const ctrPassed = fAvgCtr !== null && fAvgCtr >= 4;
              isTargetPassed = apvPassed && (fAvgCtr === null || ctrPassed);
              targetLabel = 'APV 60–80% · CTR 4–7%';
            } else {
              const apvPassed = fAvgApv !== null && fAvgApv >= 40;
              const ctrPassed = fAvgCtr !== null && fAvgCtr >= 5;
              isTargetPassed = apvPassed && (fAvgCtr === null || ctrPassed);
              targetLabel = 'APV 40–60% · CTR 5–8%';
            }

            return (
              <div
                key={`${f}-${idx}`}
                className="p-4 rounded-xl bg-zpanel border border-zline hover:border-zpink/40 transition-all space-y-2.5 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-zink truncate" title={f}>{f}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                      fTier === 'Long-Form'
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        : fTier === 'Mid-Form'
                        ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                        : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                    }`}>
                      {fTier}
                    </span>
                  </div>
                  <div className="text-[10px] text-zmuted mt-0.5">{count} video dianalisis</div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zline/40 text-xs">
                  {fTier === 'Shorts' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zmuted">Viewed:</span>
                        <span
                          className={`font-black text-xs ${
                            fAvgViewed === null
                              ? 'text-zmuted'
                              : fAvgViewed >= 70
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {fAvgViewed !== null ? `${fAvgViewed}%` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zmuted">APV:</span>
                        <span
                          className={`font-black text-xs ${
                            fAvgApv === null
                              ? 'text-zmuted'
                              : fAvgApv >= 90 && fAvgApv <= 110
                              ? 'text-zcyan'
                              : 'text-amber-400'
                          }`}
                        >
                          {fAvgApv !== null ? `${fAvgApv}%` : '—'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zmuted">APV:</span>
                        <span
                          className={`font-black text-xs ${
                            fAvgApv === null
                              ? 'text-zmuted'
                              : (fTier === 'Long-Form' ? fAvgApv >= 40 : fAvgApv >= 60)
                              ? 'text-zcyan'
                              : 'text-amber-400'
                          }`}
                        >
                          {fAvgApv !== null ? `${fAvgApv}%` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zmuted">CTR Thumb:</span>
                        <span
                          className={`font-black text-xs ${
                            fAvgCtr === null
                              ? 'text-zmuted'
                              : (fTier === 'Long-Form' ? fAvgCtr >= 5 : fAvgCtr >= 4)
                              ? 'text-purple-300'
                              : 'text-amber-400'
                          }`}
                        >
                          {fAvgCtr !== null ? `${fAvgCtr}%` : '—'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-1.5 border-t border-zline/30 flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      count === 0
                        ? 'bg-zpanel-2 text-zmuted'
                        : isTargetPassed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {count === 0 ? 'Belum Ada Data' : isTargetPassed ? 'Target Optimal' : 'Perlu Optimasi'}
                  </span>
                  <span className="text-[9px] text-zmuted/70">{targetLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* A/B Experiment Lab Table with Dual Benchmark Evaluation */}
      <div className="rounded-2xl border border-zline bg-zpanel overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zink">
                Laboratorium Eksperimen A/B & Riwayat Metrik Video
              </h3>
              <p className="text-[11px] text-zmuted mt-0.5">
                Evaluasi adaptif: Shorts (Viewed ≥70% & APV 90–110%), Mid-Form (APV 60–80% & CTR 4–7%), Long-Form (APV 40–60% & CTR 5–8%).
              </p>
            </div>
          </div>

          {/* Filter Toolbar for 11 Formats and Tiers */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-zpanel-2 border border-zline text-xs font-semibold text-zink outline-none"
            >
              <option value="all">Semua Tier</option>
              <option value="Shorts">Shorts</option>
              <option value="Mid-Form">Mid-Form</option>
              <option value="Long-Form">Long-Form</option>
            </select>

            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-zpanel-2 border border-zline text-xs font-semibold text-zink outline-none"
            >
              <option value="all">Semua 11 Format</option>
              <optgroup label="Shorts (<60 detik)">
                <option value="Flash News">Flash News</option>
                <option value="Quick Breakdown">Quick Breakdown</option>
                <option value="Actionable Tip">Actionable Tip</option>
                <option value="Myth Buster">Myth Buster</option>
              </optgroup>
              <optgroup label="Mid-Form (1–3 menit)">
                <option value="Deep Explainer">Deep Explainer</option>
                <option value="Mini Tutorial">Mini Tutorial</option>
                <option value="Case Breakdown">Case Breakdown</option>
                <option value="Video Essay">Video Essay</option>
              </optgroup>
              <optgroup label="Long-Form (5–8 menit)">
                <option value="Masterclass">Masterclass</option>
                <option value="Case Investigation">Case Investigation</option>
                <option value="Ecosystem Review">Ecosystem Review</option>
              </optgroup>
            </select>

            <span className="text-[11px] text-zmuted">{metrics.length} total video</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zline/80 bg-zpanel-2/60 text-zmuted uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-bold">Judul Video & Format</th>
                <th className="py-3 px-3 font-bold">Views & Feed</th>
                <th className="py-3 px-3 font-bold">Benchmark Utama</th>
                <th className="py-3 px-3 font-bold">Benchmark Sekunder</th>
                <th className="py-3 px-3 font-bold">Status Tolok Ukur</th>
                <th className="py-3 px-4 font-bold">Hipotesis & Hasil Eksperimen</th>
                <th className="py-3 px-3 font-bold">Langkah Berikutnya</th>
                <th className="py-3 px-3 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zline/40">
              {metrics
                .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
                .filter((m) => {
                  const evalRes = evaluateMetricBenchmark(m);
                  const matchTier = tierFilter === 'all' || evalRes.tier === tierFilter;
                  const matchFormat = formatFilter === 'all' || m.format === formatFilter;
                  return matchTier && matchFormat;
                })
                .map((m, idx) => {
                  const evalRes = evaluateMetricBenchmark(m);

                  return (
                    <tr key={`${m.id}-${idx}`} className="hover:bg-zpanel-2/40 transition-colors">
                      {/* Title & Pillar & Tier Badge */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-zink flex items-start gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 mt-0.5 ${
                            evalRes.tier === 'Long-Form'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : evalRes.tier === 'Mid-Form'
                              ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                              : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                          }`}>
                            {evalRes.tier}
                          </span>
                          <span>{m.title}</span>
                        </div>
                        <div className="text-[10px] text-zmuted mt-0.5">
                          {m.pillar} • <strong>{m.format}</strong>
                        </div>
                      </td>

                      {/* Views & Traffic */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-zink">{m.views.toLocaleString('id-ID')}</div>
                        <div className="text-[10px] text-zmuted">
                          Feed: {m.shown_in_feed.toLocaleString('id-ID')}
                        </div>
                        {m.traffic_source && (
                          <div className="text-[9px] text-zcyan/80 mt-0.5 truncate max-w-[120px]" title={m.traffic_source}>
                            {m.traffic_source}
                          </div>
                        )}
                      </td>

                      {/* Primary Benchmark (Viewed % for Shorts, APV % for Mid/Long) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-black text-sm ${
                                evalRes.primaryPassed ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {evalRes.primaryVal}
                            </span>
                            {evalRes.primaryPassed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <span className="text-[10px] text-zmuted">
                            {evalRes.primaryName}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border inline-block ${evalRes.primaryPassed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                            {evalRes.primaryStatus}
                          </span>
                        </div>
                      </td>

                      {/* Secondary Benchmark (APV % for Shorts, CTR Thumbnail for Mid/Long) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-black text-sm ${
                                evalRes.secondaryPassed ? 'text-zcyan' : 'text-amber-400'
                              }`}
                            >
                              {evalRes.secondaryVal}
                            </span>
                            {evalRes.secondaryPassed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-zcyan" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <span className="text-[10px] text-zmuted">
                            {evalRes.secondaryName}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border inline-block ${evalRes.secondaryPassed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                            {evalRes.secondaryStatus}
                          </span>
                        </div>
                      </td>

                      {/* Overall Status Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold border inline-block ${evalRes.overallClass}`}>
                          {evalRes.overallStatus}
                        </span>
                      </td>

                      {/* Hypothesis & Result */}
                      <td className="py-3.5 px-4 max-w-sm">
                        {m.experiment_hypothesis && (
                          <div className="text-[11px] text-zink/90 font-medium leading-snug">
                            <strong>Uji:</strong> {m.experiment_hypothesis}
                          </div>
                        )}
                        {m.experiment_result && (
                          <div className="text-[10px] text-zmuted mt-1 leading-snug">
                            <strong>Hasil:</strong> {m.experiment_result}
                          </div>
                        )}
                      </td>

                      {/* Next action */}
                      <td className="py-3.5 px-3 max-w-xs text-[11px] text-emerald-300 font-medium">
                        {m.experiment_next || 'Lanjutkan pemantauan'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {onOpenMetricModal && (
                            <button
                              onClick={() => onOpenMetricModal(m)}
                              className="px-2 py-1 rounded bg-zpanel-2 hover:bg-zline/60 border border-zline text-[11px] font-semibold text-zink transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => setMetricToDelete(m)}
                            className="p-1 rounded text-zmuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Hapus metrik"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialogModal
        isOpen={metricToDelete !== null}
        title="Hapus Metrik Video?"
        message={`Apakah Anda yakin ingin menghapus data analitik untuk video "${metricToDelete?.title || ''}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={() => {
          if (metricToDelete) {
            studioStore.deleteMetric(metricToDelete.id);
            showToast(`Metrik "${metricToDelete.title}" dihapus`, 'info');
            setMetricToDelete(null);
          }
        }}
        onCancel={() => setMetricToDelete(null)}
      />
    </div>
  );
}
