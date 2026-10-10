'use client';

import React, { useState } from 'react';
import { TrendSignal, RssFeedSource, VideoFormat, Pillar } from '../../lib/types';
import { studioStore } from '../../lib/storage';
import { useToast } from '../ToastContainer';
import { generateWithTaskRouter } from '../../lib/ai-service';
import {
  Radio,
  Rss,
  Youtube,
  TrendingUp,
  Bookmark,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CheckCircle,
  Save,
  Trash2,
} from 'lucide-react';

interface RadarTrenModuleProps {
  trends: TrendSignal[];
  onNavigate: (tab: string, itemId?: string) => void;
  onOpenResearchWithTrend: (trend: TrendSignal) => void;
}

export function RadarTrenModule({
  trends,
  onNavigate,
  onOpenResearchWithTrend,
}: RadarTrenModuleProps) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'rss' | 'youtube' | 'google' | 'saved' | 'feeds' | 'activity'>('rss');
  const [search, setSearch] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom feed modal / input
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('Tech');

  // Angle modal / generated state
  const [selectedTrendForAngle, setSelectedTrendForAngle] = useState<TrendSignal | null>(null);
  const [generatedAngles, setGeneratedAngles] = useState<string | null>(null);
  const [isGeneratingAngle, setIsGeneratingAngle] = useState(false);

  // Preset state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const feeds = studioStore.getFeeds();
  const logs = studioStore.getLogs();
  const presets = studioStore.getPresets();

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) {
      setPillarFilter('all');
      setSearch('');
      showToast('Filter preset direset', 'info');
      return;
    }
    const p = presets.find((item) => item.id === presetId);
    if (p) {
      if (p.filters.pillar) setPillarFilter(p.filters.pillar);
      if (p.filters.search !== undefined) setSearch(p.filters.search);
      if (p.tab && ['rss', 'youtube', 'google', 'saved'].includes(p.tab)) {
        setActiveTab(p.tab as any);
      }
      showToast(`Preset filter "${p.name}" diterapkan`, 'info');
    }
  };

  const handleSaveCurrentAsPreset = () => {
    const name = prompt(
      'Masukkan nama preset filter:',
      `${pillarFilter !== 'all' ? pillarFilter : 'Semua Pilar'} (${activeTab.toUpperCase()})`
    );
    if (!name) return;
    studioStore.savePreset({
      name,
      tab: (['rss', 'youtube', 'google', 'saved'].includes(activeTab) ? activeTab : 'rss') as any,
      filters: {
        pillar: pillarFilter,
        search,
      },
    });
    showToast(`Preset "${name}" berhasil disimpan`, 'success');
  };

  const filteredTrends = trends
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .filter((t) => {
      const matchTab = activeTab === 'saved' ? t.user_status === 'Tersimpan' : t.source_platform === activeTab;
      const matchSearch =
        !search ||
        t.headline.toLowerCase().includes(search.toLowerCase()) ||
        t.summary.toLowerCase().includes(search.toLowerCase()) ||
        t.source_name.toLowerCase().includes(search.toLowerCase());
      const matchPillar = pillarFilter === 'all' || t.pillar === pillarFilter;
      return matchTab && matchSearch && matchPillar;
    });

  const inferPillarFromText = (text: string): Pillar => {
    const lower = text.toLowerCase();
    if (/\bai\b|artificial|gemini|gpt|claude|deepseek|\bnpu\b|\bllm\b|algoritma|\bbot\b|robot/i.test(lower)) return 'AI & Technology';
    if (/game|gaming|steam|playstation|xbox|esport|gta|roblox|genshin/i.test(lower)) return 'Gaming & Digital Entertainment';
    if (/uang|gaji|fintech|kripto|crypto|saham|belanja|e-commerce|tarif|ekonomi|monetisasi/i.test(lower)) return 'Digital Economy & Consumer Culture';
    if (/whatsapp|wa|instagram|ig|tiktok|youtube|yt|twitter|x|medsos|viral|fitur|update/i.test(lower)) return 'Internet & Social Media';
    return 'Modern Life & Human Behavior';
  };

  const handleRefreshFeed = async () => {
    setIsRefreshing(true);
    try {
      const activeFeeds = studioStore.getFeeds().filter((f) => f.is_active);
      let newSignalCount = 0;
      const existingUrls = new Set(trends.map((t) => t.url).filter(Boolean));
      const existingHeadlines = new Set(trends.map((t) => t.headline.trim().toLowerCase()).filter(Boolean));

      // 1. Refresh active RSS Feeds
      for (const feed of activeFeeds) {
        try {
          const res = await fetch('/api/trends/rss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedUrl: feed.feed_url, feedName: feed.feed_name }),
          });

          if (res.ok) {
            const data = await res.json();
            studioStore.saveFeed({
              ...feed,
              last_fetched_at: new Date().toISOString(),
              fetch_status: 'healthy',
            });

            if (data.items && Array.isArray(data.items)) {
              for (const item of data.items) {
                const normTitle = (item.title || '').trim().toLowerCase();
                if (item.link && !existingUrls.has(item.link) && (!normTitle || !existingHeadlines.has(normTitle))) {
                  existingUrls.add(item.link);
                  if (normTitle) existingHeadlines.add(normTitle);
                  const pillar = inferPillarFromText(item.title + ' ' + (item.description || ''));
                  studioStore.addCustomTrend({
                    source_platform: 'rss',
                    source_name: feed.feed_name,
                    headline: item.title,
                    summary: item.description || item.title,
                    url: item.link,
                    source_pub_date: new Date().toISOString().slice(0, 10),
                    pillar,
                    format_suggestion: 'Flash News',
                    relevance_score: 88,
                    momentum_score: 85,
                    visual_score: 80,
                    question_title: `Apa Dampak ${item.title}?`,
                    hook_suggestion: `Berita teknologi terbaru: ${item.title}`,
                    rationale: `Sinyal baru diserap langsung dari ${feed.feed_name}`,
                  });
                  newSignalCount++;
                }
              }
            }
          } else {
            studioStore.saveFeed({
              ...feed,
              last_fetched_at: new Date().toISOString(),
              fetch_status: 'warning',
              error_message: `HTTP ${res.status}`,
            });
          }
        } catch (err: any) {
          studioStore.saveFeed({
            ...feed,
            last_fetched_at: new Date().toISOString(),
            fetch_status: 'error',
            error_message: err.message,
          });
        }
      }

      // 2. Refresh Google Trends Indonesia
      try {
        const googleRes = await fetch('/api/trends/google');
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          if (googleData.items && Array.isArray(googleData.items)) {
            for (const item of googleData.items) {
              const normTitle = (item.title || '').trim().toLowerCase();
              if (item.link && !existingUrls.has(item.link) && (!normTitle || !existingHeadlines.has(normTitle))) {
                existingUrls.add(item.link);
                if (normTitle) existingHeadlines.add(normTitle);
                const pillar = inferPillarFromText(item.title + ' ' + (item.description || ''));
                studioStore.addCustomTrend({
                  source_platform: 'google',
                  source_name: 'Google Trends ID',
                  headline: item.title,
                  summary: item.description || item.title,
                  url: item.link,
                  source_pub_date: new Date().toISOString().slice(0, 10),
                  pillar,
                  format_suggestion: 'Quick Breakdown',
                  relevance_score: 93,
                  momentum_score: 95,
                  visual_score: 85,
                  question_title: `Kenapa ${item.title} Jadi Sorotan Publik?`,
                  hook_suggestion: `Topik ini mendadak mencatat lonjakan pencarian di Google hari ini.`,
                  rationale: `Sinyal pencarian trending dari Google Trends Indonesia (${item.approxTraffic || 'Volume Tinggi'})`,
                });
                newSignalCount++;
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Google Trends refresh notice:', err);
      }

      // 3. Refresh YouTube Trends Tech / Shorts
      try {
        const ytRes = await fetch('/api/trends/youtube');
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (ytData.items && Array.isArray(ytData.items)) {
            for (const item of ytData.items) {
              const normTitle = (item.title || '').trim().toLowerCase();
              if (item.link && !existingUrls.has(item.link) && (!normTitle || !existingHeadlines.has(normTitle))) {
                existingUrls.add(item.link);
                if (normTitle) existingHeadlines.add(normTitle);
                const pillar = inferPillarFromText(item.title + ' ' + (item.description || ''));
                studioStore.addCustomTrend({
                  source_platform: 'youtube',
                  source_name: 'YouTube Shorts Trends',
                  headline: item.title,
                  summary: item.description || item.title,
                  url: item.link,
                  source_pub_date: new Date().toISOString().slice(0, 10),
                  pillar,
                  format_suggestion: 'Quick Breakdown',
                  relevance_score: 90,
                  momentum_score: 92,
                  visual_score: 90,
                  question_title: `Bagaimana Dampak ${item.title.slice(0, 45)}?`,
                  hook_suggestion: `Video terkait topik ini sedang ramai dibahas di YouTube Shorts.`,
                  rationale: `Sinyal engagement video dari YouTube Trends (${item.author || 'Trending'})`,
                });
                newSignalCount++;
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('YouTube Trends refresh notice:', err);
      }

      if (newSignalCount > 0) {
        showToast(`Radar Tren: ${newSignalCount} sinyal baru (RSS, Google, YouTube) berhasil diserap!`, 'success');
      } else {
        showToast(`Radar Tren diperiksa. Semua tab (RSS, Google, YouTube) up-to-date.`, 'info');
      }
    } catch {
      showToast('Gagal menyinkronkan feed sinyal live', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveTrend = (t: TrendSignal) => {
    studioStore.updateTrendStatus(t.id, 'Tersimpan');
    showToast(`Tren "${t.headline.slice(0, 30)}..." disimpan ke koleksi`, 'success');
  };

  const handleConvertToIdea = (t: TrendSignal) => {
    const idea = studioStore.saveContentItem({
      type: 'idea',
      title: t.question_title || `Apa Dampak ${t.headline}?`,
      pillar: t.pillar,
      format: t.format_suggestion || 'Quick Breakdown',
      status: 'Ide',
      priority: t.momentum_score >= 90 ? 'Tinggi' : 'Sedang',
      visual_readiness: t.visual_score >= 90 ? 'Siap' : 'Perlu aset',
      hook: t.hook_suggestion || t.headline,
      source_url: t.url,
      notes: `Diimpor dari Radar Tren: ${t.source_name} (${t.source_pub_date}). ${t.rationale}`,
    });

    studioStore.updateTrendStatus(t.id, 'Dijadikan ide');
    showToast(`Topik ditambahkan ke Idea Bank: "${idea.title}"`, 'success', true);
  };

  const handleGenerateAngles = async (t: TrendSignal) => {
    setSelectedTrendForAngle(t);
    setIsGeneratingAngle(true);
    setGeneratedAngles(null);
    try {
      const res = await generateWithTaskRouter('angles', {
        headline: t.headline,
        pillar: t.pillar,
        format: t.format_suggestion,
      });
      setGeneratedAngles(res.text);
      showToast('3 Content Angles berhasil dibuat oleh AI', 'info');
    } catch {
      showToast('Gagal memproses AI Angles', 'error');
    } finally {
      setIsGeneratingAngle(false);
    }
  };

  const handleAddCustomFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName || !newFeedUrl) return;

    studioStore.saveFeed({
      feed_name: newFeedName,
      feed_url: newFeedUrl,
      category: newFeedCategory,
      is_active: true,
      fetch_status: 'healthy',
    });

    setNewFeedName('');
    setNewFeedUrl('');
    showToast(`Sumber RSS "${newFeedName}" berhasil ditambahkan`, 'success');
  };

  const handleDeleteFeed = (id: string) => {
    studioStore.deleteFeed(id);
    showToast('Sumber feed dihapus', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-zcyan uppercase tracking-widest">
            RADAR TREN & INGESTION ENGINE
          </div>
          <h1 className="text-2xl font-black text-zink mt-1">Radar Tren & Sinyal Berita</h1>
          <p className="text-xs text-zmuted mt-0.5">
            Penyerapan real-time dari RSS newsroom resmi, YouTube Trends, dan Google Trends dengan auto-scoring relevansi 5 pilar Zeinity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={isRefreshing}
            onClick={handleRefreshFeed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-zcyan' : ''}`} />
            <span>{isRefreshing ? 'Memperbarui...' : 'Refresh Sinyal'}</span>
          </button>
        </div>
      </div>

      {/* Source Category Tabs */}
      <div className="flex items-center gap-2 border-b border-zline/60 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: 'rss', label: 'RSS Newsroom', icon: Rss },
          { id: 'youtube', label: 'YouTube Trends', icon: Youtube },
          { id: 'google', label: 'Google Trends', icon: TrendingUp },
          { id: 'saved', label: 'Tren Tersimpan', icon: Bookmark },
          { id: 'feeds', label: 'Katalog Sumber RSS', icon: Radio },
          { id: 'activity', label: 'Log Aktivitas', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-zcyan text-black shadow-sm'
                  : 'bg-zpanel text-zmuted hover:text-zink border border-zline/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar (if tab is rss, youtube, google, or saved) */}
      {['rss', 'youtube', 'google', 'saved'].includes(activeTab) && (
        <div className="p-4 rounded-xl bg-zpanel border border-zline flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-zmuted" />
            <input
              type="text"
              placeholder="Cari headline atau platform..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-zink placeholder-zmuted outline-none"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Presets Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-zmuted text-[11px]">Preset:</span>
              <select
                value={selectedPresetId}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none max-w-[140px] truncate"
              >
                <option value="">Pilih Preset...</option>
                {presets
                  .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
                  .map((p, idx) => (
                    <option key={`${p.id}-${idx}`} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleSaveCurrentAsPreset}
                className="px-2 py-1 rounded-lg bg-zpanel-2 hover:bg-zline/60 border border-zline text-[11px] text-zmuted hover:text-zcyan font-medium transition-colors"
                title="Simpan konfigurasi filter saat ini sebagai preset baru"
              >
                + Simpan
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zmuted text-[11px]">Pilar:</span>
              <select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value)}
                className="bg-zpanel-2 border border-zline rounded-lg px-2.5 py-1 text-zink text-xs outline-none"
              >
                <option value="all">Semua Pilar</option>
                <option value="Internet & Social Media">Internet & Social Media</option>
                <option value="AI & Technology">AI & Technology</option>
                <option value="Digital Economy & Consumer Culture">Digital Economy & Consumer Culture</option>
                <option value="Gaming & Digital Entertainment">Gaming & Digital Entertainment</option>
                <option value="Modern Life & Human Behavior">Modern Life & Human Behavior</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TREND SIGNALS (RSS, YOUTUBE, GOOGLE, SAVED) */}
      {['rss', 'youtube', 'google', 'saved'].includes(activeTab) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrends.length === 0 ? (
            <div className="col-span-full py-16 text-center text-zmuted text-xs border border-dashed border-zline rounded-2xl bg-zpanel/40">
              Tidak ada sinyal tren yang cocok dengan pencarian / tab ini.
            </div>
          ) : (
            filteredTrends.map((t, idx) => (
              <div
                key={`${t.id}-${idx}`}
                className="p-5 rounded-2xl bg-zpanel border border-zline hover:border-zcyan/50 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top source & momentum badges */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zcyan text-[11px] truncate max-w-[150px]">
                      {t.source_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-zpanel-2 border border-zline text-zink">
                      Momentum: {t.momentum_score}/100
                    </span>
                  </div>

                  {/* Headline & Summary */}
                  <div>
                    <h3 className="text-sm font-bold text-zink leading-snug">
                      {t.headline}
                    </h3>
                    <p className="text-xs text-zmuted mt-1.5 leading-relaxed line-clamp-3">
                      {t.summary}
                    </p>
                  </div>

                  {/* Editorial Suggestions Pill */}
                  <div className="p-3 rounded-xl bg-zpanel-2/70 border border-zline/60 space-y-1.5 text-[11px]">
                    <div className="text-zmuted font-semibold">
                      Saran Judul: <strong className="text-zcyan">{t.question_title}</strong>
                    </div>
                    <div className="flex items-center justify-between text-zmuted pt-1">
                      <span>Format: <strong className="text-zink">{t.format_suggestion}</strong></span>
                      <span>Visual: <strong className="text-emerald-400">{t.visual_score}/100</strong></span>
                    </div>
                  </div>

                  {/* Official URL */}
                  <div className="flex items-center justify-between text-[11px] text-zmuted">
                    <span>{t.source_pub_date} · {t.freshness}</span>
                    {t.url && (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-zcyan hover:underline"
                      >
                        Sumber Resmi <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons Bottom */}
                <div className="pt-3 border-t border-zline/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSaveTrend(t)}
                      className="px-2.5 py-1.5 rounded-lg bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zink transition-colors"
                      title="Simpan tren"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleGenerateAngles(t)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zpanel-2 hover:bg-zline/60 border border-zline text-xs font-semibold text-zpink transition-colors"
                      title="Generate 3 Content Angles"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Angles
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenResearchWithTrend(t)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors"
                    >
                      Mulai Riset
                    </button>
                    <button
                      onClick={() => handleConvertToIdea(t)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs transition-colors shadow-sm"
                    >
                      <span>Jadikan Ide</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: RSS CATALOG & CUSTOM FEED MANAGER */}
      {activeTab === 'feeds' && (
        <div className="space-y-6">
          {/* Add Custom Feed Form */}
          <form
            onSubmit={handleAddCustomFeed}
            className="p-5 rounded-2xl bg-zpanel border border-zline space-y-4 max-w-2xl"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-zcyan" />
              <h3 className="text-sm font-bold text-zink">Tambah Sumber RSS Kustom</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-zmuted font-semibold">Nama Media / Blog</label>
                <input
                  type="text"
                  placeholder="Misal: Verge Tech Newsroom"
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zmuted font-semibold">Kategori</label>
                <select
                  value={newFeedCategory}
                  onChange={(e) => setNewFeedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
                >
                  <option value="AI / Newsroom">AI / Newsroom</option>
                  <option value="Tech / OS">Tech / OS</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Consumer Fintech">Consumer Fintech</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-zmuted font-semibold">URL Feed XML/RSS</label>
                <input
                  type="url"
                  placeholder="https://example.com/feed.xml"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zpanel-2 border border-zline text-zink outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black font-bold text-xs transition-colors"
            >
              Simpan Sumber RSS Baru
            </button>
          </form>

          {/* Active Feeds Table */}
          <div className="rounded-2xl border border-zline bg-zpanel overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zline/80 bg-zpanel-2/60 text-zmuted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Sumber Feed</th>
                  <th className="py-3 px-3 font-bold">Kategori</th>
                  <th className="py-3 px-3 font-bold">Status Kesehatan</th>
                  <th className="py-3 px-3 font-bold">URL</th>
                  <th className="py-3 px-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zline/40">
                {feeds
                  .filter((f, i, arr) => arr.findIndex((x) => x.id === f.id) === i)
                  .map((f, idx) => (
                    <tr key={`${f.id}-${idx}`} className="hover:bg-zpanel-2/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-zink">{f.feed_name}</td>
                      <td className="py-3 px-3 text-zmuted">{f.category}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {f.fetch_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zmuted truncate max-w-xs">{f.feed_url}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteFeed(f.id)}
                          className="p-1.5 rounded-lg text-zmuted hover:text-red-400 hover:bg-zpanel-2"
                          title="Hapus sumber"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACTIVITY LOG */}
      {activeTab === 'activity' && (
        <div className="p-5 rounded-2xl bg-zpanel border border-zline space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zcyan" />
            <h3 className="text-sm font-bold text-zink">Riwayat Aktivitas & Perubahan</h3>
          </div>
          <div className="space-y-2">
            {logs
              .filter((log, i, arr) => arr.findIndex((x) => x.id === log.id) === i)
              .map((log, idx) => (
                <div
                  key={`${log.id}-${idx}`}
                  className="p-3 rounded-xl bg-zpanel-2 border border-zline/60 flex items-center justify-between text-xs"
                >
                <div>
                  <div className="font-semibold text-zink">{log.action}</div>
                  {log.details && <div className="text-[11px] text-zmuted">{log.details}</div>}
                </div>
                <span className="text-[10px] text-zmuted font-mono">
                  {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  WIB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Content Angles Modal */}
      {selectedTrendForAngle && (
        <div className="fixed inset-0 z-[9990] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-xl bg-zpanel border border-zline rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zline pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zpink" />
                <h3 className="text-sm font-bold text-zink">3 Content Angles Generator</h3>
              </div>
              <button
                onClick={() => setSelectedTrendForAngle(null)}
                className="text-xs text-zmuted hover:text-zink"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="text-xs text-zmuted">
              Topik: <strong className="text-zink">{selectedTrendForAngle.headline}</strong>
            </div>

            {isGeneratingAngle ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-zcyan" />
                <span className="text-xs text-zmuted">AI merumuskan 3 sudut pandang Shorts...</span>
              </div>
            ) : generatedAngles ? (
              <div className="p-4 rounded-xl bg-zpanel-2 border border-zline/80 space-y-3">
                <pre className="text-xs text-zink/90 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
                  {generatedAngles}
                </pre>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTrendForAngle(null)}
                className="px-4 py-2 rounded-xl bg-zpanel-2 border border-zline text-xs font-semibold text-zink"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  handleConvertToIdea(selectedTrendForAngle);
                  setSelectedTrendForAngle(null);
                }}
                className="px-4 py-2 rounded-xl bg-zcyan hover:bg-zcyan-hover text-black text-xs font-bold"
              >
                Simpan ke Idea Bank
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
