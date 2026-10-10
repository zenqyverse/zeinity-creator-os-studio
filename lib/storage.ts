import {
  ContentItem,
  ResearchSource,
  StoryboardScene,
  MediaAsset,
  ProductionChecklist,
  AnalyticsMetric,
  TrendSignal,
  RssFeedSource,
  AiConfig,
  FilterPreset,
  ActivityLog,
  ScriptVersion,
} from './types';
import {
  INITIAL_CONTENT_ITEMS,
  INITIAL_IDEAS,
  INITIAL_RESEARCH_SOURCES,
  INITIAL_STORYBOARD_SCENES,
  INITIAL_CHECKLISTS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_METRICS,
  INITIAL_TREND_SIGNALS,
  INITIAL_RSS_FEEDS,
  INITIAL_AI_CONFIGS,
  INITIAL_SCRIPT_VERSIONS,
} from './mock-data';
import { supabase, isSupabaseConfigured } from './supabase';

export type AutosaveStatus = 'Tersimpan' | 'Menyimpan...' | 'Gagal menyimpan';

type StorageListener = () => void;

let idCounter = 0;
export function generateUniqueId(prefix: string): string {
  idCounter = (idCounter + 1) % 100000;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}-${idCounter}`;
}

export function dedupeArrayById<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  let fallbackCount = 0;
  for (const item of items) {
    if (!item) continue;
    let id = item.id;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      id = `auto-${Date.now().toString(36)}-${++fallbackCount}`;
      (item as any).id = id;
    }
    if (!seen.has(id)) {
      seen.add(id);
      result.push(item);
    }
  }
  return result;
}


class StudioStore {
  private contentItems: ContentItem[] = [];
  private ideas: ContentItem[] = [];
  private sources: ResearchSource[] = [];
  private storyboards: StoryboardScene[] = [];
  private checklists: ProductionChecklist[] = [];
  private assets: MediaAsset[] = [];
  private metrics: AnalyticsMetric[] = [];
  private trends: TrendSignal[] = [];
  private feeds: RssFeedSource[] = [];
  private aiConfigs: AiConfig[] = [];
  private presets: FilterPreset[] = [];
  private logs: ActivityLog[] = [];
  private scriptVersions: ScriptVersion[] = [];

  private listeners: Set<StorageListener> = new Set();
  private autosaveStatus: AutosaveStatus = 'Tersimpan';
  private undoStack: Array<{ type: string; payload: any; action: string }> = [];
  private initialized: boolean = false;

  constructor() {
    // Lazy initialize on first browser load or server fallback
    if (typeof window !== 'undefined') {
      this.loadFromLocalStorage();
    } else {
      this.loadDefaults();
    }
  }

  private loadDefaults() {
    this.contentItems = dedupeArrayById([...INITIAL_CONTENT_ITEMS]);
    this.ideas = dedupeArrayById([...INITIAL_IDEAS]);
    this.sources = dedupeArrayById([...INITIAL_RESEARCH_SOURCES]);
    this.storyboards = dedupeArrayById([...INITIAL_STORYBOARD_SCENES]);
    this.checklists = dedupeArrayById([...INITIAL_CHECKLISTS]);
    this.assets = dedupeArrayById([...INITIAL_MEDIA_ASSETS]);
    this.metrics = dedupeArrayById([...INITIAL_METRICS]);
    this.trends = dedupeArrayById([...INITIAL_TREND_SIGNALS]);
    this.feeds = dedupeArrayById([...INITIAL_RSS_FEEDS]);
    this.aiConfigs = dedupeArrayById([...INITIAL_AI_CONFIGS]);
    this.scriptVersions = dedupeArrayById([...INITIAL_SCRIPT_VERSIONS]);
    this.presets = dedupeArrayById([
      {
        id: 'p-01',
        name: 'AI & Tech 24 Jam Terakhir',
        tab: 'rss',
        filters: { pillar: 'AI & Technology', fresh: '24', min: 85 },
        created_at: new Date().toISOString(),
      },
      {
        id: 'p-02',
        name: 'Rising Video Signals (Momentum 90+)',
        tab: 'youtube',
        filters: { momentum: 90, status: 'Rising' },
        created_at: new Date().toISOString(),
      },
    ]);
    this.logs = dedupeArrayById([
      {
        id: 'log-01',
        action: 'Sistem diinisialisasi',
        details: 'Mode fallback data demo Zeinity Creator Studio aktif',
        timestamp: new Date().toISOString(),
      },
    ]);
    this.initialized = true;
  }

  public loadFromLocalStorage() {
    try {
      const get = (k: string) => {
        const val = localStorage.getItem(`zeinity_${k}`);
        return val ? JSON.parse(val) : null;
      };

      this.contentItems = dedupeArrayById(get('content_items') || [...INITIAL_CONTENT_ITEMS]);
      this.ideas = dedupeArrayById(get('ideas') || [...INITIAL_IDEAS]);
      this.sources = dedupeArrayById(get('sources') || [...INITIAL_RESEARCH_SOURCES]);
      this.storyboards = dedupeArrayById(get('storyboards') || [...INITIAL_STORYBOARD_SCENES]);
      this.checklists = dedupeArrayById(get('checklists') || [...INITIAL_CHECKLISTS]);
      this.assets = dedupeArrayById(get('assets') || [...INITIAL_MEDIA_ASSETS]);
      this.metrics = dedupeArrayById(get('metrics') || [...INITIAL_METRICS]);
      this.trends = dedupeArrayById(get('trends') || [...INITIAL_TREND_SIGNALS]);
      this.feeds = dedupeArrayById(get('feeds') || [...INITIAL_RSS_FEEDS]);
      this.aiConfigs = dedupeArrayById(get('ai_configs') || [...INITIAL_AI_CONFIGS]);
      this.scriptVersions = dedupeArrayById(get('script_versions') || [...INITIAL_SCRIPT_VERSIONS]);
      this.presets = dedupeArrayById(get('presets') || [
        {
          id: 'p-01',
          name: 'AI & Tech 24 Jam Terakhir',
          tab: 'rss',
          filters: { pillar: 'AI & Technology', fresh: '24', min: 85 },
          created_at: new Date().toISOString(),
        },
      ]);
      this.logs = dedupeArrayById(get('logs') || []);
      this.initialized = true;

      // Heal / flush deduped collections to localStorage to clean up any duplicate IDs
      if (typeof window !== 'undefined') {
        localStorage.setItem('zeinity_trends', JSON.stringify(this.trends));
        localStorage.setItem('zeinity_content_items', JSON.stringify(this.contentItems));
        localStorage.setItem('zeinity_ideas', JSON.stringify(this.ideas));
        localStorage.setItem('zeinity_sources', JSON.stringify(this.sources));
        localStorage.setItem('zeinity_storyboards', JSON.stringify(this.storyboards));
        localStorage.setItem('zeinity_checklists', JSON.stringify(this.checklists));
        localStorage.setItem('zeinity_assets', JSON.stringify(this.assets));
        localStorage.setItem('zeinity_metrics', JSON.stringify(this.metrics));
        localStorage.setItem('zeinity_feeds', JSON.stringify(this.feeds));
        localStorage.setItem('zeinity_presets', JSON.stringify(this.presets));
        localStorage.setItem('zeinity_ai_configs', JSON.stringify(this.aiConfigs));
        localStorage.setItem('zeinity_script_versions', JSON.stringify(this.scriptVersions));
        localStorage.setItem('zeinity_logs', JSON.stringify(this.logs));
      }

      // Kick off background Supabase sync if credentials exist
      if (typeof window !== 'undefined' && isSupabaseConfigured()) {
        this.initSupabaseSync();
      }
    } catch {
      this.loadDefaults();
    }
  }

  private saveToLocalStorage(key: string, data: any) {
    if (typeof window === 'undefined') return;
    this.autosaveStatus = 'Menyimpan...';
    this.notify();

    try {
      localStorage.setItem(`zeinity_${key}`, JSON.stringify(data));
      setTimeout(() => {
        this.autosaveStatus = 'Tersimpan';
        this.notify();
      }, 300);
    } catch {
      this.autosaveStatus = 'Gagal menyimpan';
      this.notify();
    }
  }

  public subscribe(fn: StorageListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getAutosaveStatus(): AutosaveStatus {
    return this.autosaveStatus;
  }

  // --- Content Items & Ideas ---
  public getContentItems(): ContentItem[] {
    return dedupeArrayById(this.contentItems);
  }

  public getIdeas(): ContentItem[] {
    return dedupeArrayById(this.ideas);
  }

  public getContentById(id: string): ContentItem | undefined {
    return this.contentItems.find((c) => c.id === id) || this.ideas.find((i) => i.id === id);
  }

  public saveContentItem(item: Partial<ContentItem> & { id?: string }): ContentItem {
    const isNew = !item.id;
    const now = new Date().toISOString();

    const targetList = item.type === 'idea' ? this.ideas : this.contentItems;
    const normalizedTitle = item.title ? item.title.trim().toLowerCase() : '';
    const normalizedUrl = item.source_url ? item.source_url.trim().toLowerCase() : '';

    // Enforce deduplication: check existing by ID, identical title, or source_url
    let existingIdx = -1;
    if (item.id) {
      existingIdx = targetList.findIndex((x) => x.id === item.id);
    }
    if (existingIdx === -1 && normalizedTitle) {
      existingIdx = targetList.findIndex((x) => x.title && x.title.trim().toLowerCase() === normalizedTitle);
    }
    if (existingIdx === -1 && normalizedUrl) {
      existingIdx = targetList.findIndex((x) => x.source_url && x.source_url.trim().toLowerCase() === normalizedUrl);
    }

    const existingItem = existingIdx >= 0 ? targetList[existingIdx] : undefined;
    const id = existingItem ? existingItem.id : (item.id || generateUniqueId(`zein-${item.type === 'idea' ? 'i' : 'c'}`));

    const fullItem: ContentItem = {
      id,
      type: item.type || existingItem?.type || 'content',
      title: item.title || existingItem?.title || 'Untitled',
      pillar: item.pillar || existingItem?.pillar || 'AI & Technology',
      format: item.format || existingItem?.format || 'Quick Breakdown',
      status: item.status || existingItem?.status || (item.type === 'idea' ? 'Ide' : 'Ide'),
      priority: item.priority || existingItem?.priority || 'Sedang',
      visual_readiness: item.visual_readiness || existingItem?.visual_readiness || 'Belum dicek',
      hook: item.hook ?? existingItem?.hook ?? '',
      script_hook: item.script_hook ?? existingItem?.script_hook ?? '',
      script_context: item.script_context ?? existingItem?.script_context ?? '',
      script_payoff: item.script_payoff ?? existingItem?.script_payoff ?? '',
      script_ending: item.script_ending ?? existingItem?.script_ending ?? '',
      word_count: item.word_count ?? existingItem?.word_count ?? 0,
      duration_estimate: item.duration_estimate ?? existingItem?.duration_estimate ?? 0,
      target_wpm: item.target_wpm ?? existingItem?.target_wpm ?? 145,
      publish_date: item.publish_date ?? existingItem?.publish_date,
      production_due: item.production_due ?? existingItem?.production_due,
      source_url: item.source_url ?? existingItem?.source_url ?? '',
      notes: item.notes ?? existingItem?.notes ?? '',
      created_at: item.created_at || existingItem?.created_at || now,
      updated_at: now,
    };

    if (fullItem.type === 'idea') {
      const idx = existingIdx >= 0 ? existingIdx : this.ideas.findIndex((i) => i.id === id);
      if (idx >= 0) {
        this.undoStack.push({ type: 'idea', payload: this.ideas[idx], action: 'update' });
        this.ideas[idx] = fullItem;
      } else {
        this.undoStack.push({ type: 'idea', payload: fullItem, action: 'create' });
        this.ideas.unshift(fullItem);
      }
      this.ideas = dedupeArrayById(this.ideas);
      this.saveToLocalStorage('ideas', this.ideas);
    } else {
      const idx = existingIdx >= 0 ? existingIdx : this.contentItems.findIndex((c) => c.id === id);
      if (idx >= 0) {
        this.undoStack.push({ type: 'content', payload: this.contentItems[idx], action: 'update' });
        this.contentItems[idx] = fullItem;
      } else {
        this.undoStack.push({ type: 'content', payload: fullItem, action: 'create' });
        this.contentItems.unshift(fullItem);
      }
      this.contentItems = dedupeArrayById(this.contentItems);
      this.saveToLocalStorage('content_items', this.contentItems);
    }

    this.persistToSupabase('content_items', fullItem);
    this.logActivity(isNew && !existingItem ? `Membuat ${fullItem.type}: ${fullItem.title}` : `Memperbarui ${fullItem.type}: ${fullItem.title}`);
    this.notify();
    return fullItem;
  }

  public deleteItem(id: string): boolean {
    const contentIdx = this.contentItems.findIndex((c) => c.id === id);
    if (contentIdx >= 0) {
      const removed = this.contentItems.splice(contentIdx, 1)[0];
      this.undoStack.push({ type: 'content_items', payload: removed, action: 'delete' });
      this.saveToLocalStorage('content_items', this.contentItems);
      this.deleteFromSupabase('content_items', id);
      this.logActivity(`Menghapus konten: ${removed.title}`);
      this.notify();
      return true;
    }

    const ideaIdx = this.ideas.findIndex((i) => i.id === id);
    if (ideaIdx >= 0) {
      const removed = this.ideas.splice(ideaIdx, 1)[0];
      this.undoStack.push({ type: 'ideas', payload: removed, action: 'delete' });
      this.saveToLocalStorage('ideas', this.ideas);
      this.deleteFromSupabase('content_items', id);
      this.logActivity(`Menghapus ide: ${removed.title}`);
      this.notify();
      return true;
    }

    return false;
  }

  public convertIdeaToContent(ideaId: string): ContentItem | null {
    const ideaIdx = this.ideas.findIndex((i) => i.id === ideaId);
    if (ideaIdx === -1) return null;

    const idea = this.ideas.splice(ideaIdx, 1)[0];
    const newContent: ContentItem = {
      ...idea,
      id: generateUniqueId('zein-c'),
      type: 'content',
      status: 'Riset',
      updated_at: new Date().toISOString(),
    };

    this.contentItems.unshift(newContent);
    this.ideas = dedupeArrayById(this.ideas);
    this.contentItems = dedupeArrayById(this.contentItems);
    this.saveToLocalStorage('ideas', this.ideas);
    this.saveToLocalStorage('content_items', this.contentItems);
    this.logActivity(`Mengonversi ide ke konten pipeline: ${newContent.title}`);
    this.notify();
    return newContent;
  }

  // --- Research Sources ---
  public getSources(): ResearchSource[] {
    return dedupeArrayById(this.sources);
  }

  public getSourcesByContentId(contentId: string): ResearchSource[] {
    return dedupeArrayById(this.sources).filter((s) => s.content_id === contentId);
  }

  public saveSource(source: Partial<ResearchSource> & { id?: string }): ResearchSource {
    const id = source.id || generateUniqueId('src');
    const now = new Date().toISOString();

    const fullSource: ResearchSource = {
      id,
      content_id: source.content_id,
      source_title: source.source_title || 'Untitled Source',
      source_url: source.source_url || '',
      source_platform: source.source_platform || 'Web',
      source_pub_date: source.source_pub_date,
      source_checked_date: source.source_checked_date || new Date().toISOString().slice(0, 10),
      claim: source.claim || '',
      evidence_quote: source.evidence_quote || '',
      conclusion: source.conclusion || '',
      verification_status: source.verification_status || 'Perlu Konfirmasi',
      is_rumor: Boolean(source.is_rumor),
      notes: source.notes || '',
      created_at: source.created_at || now,
      updated_at: now,
    };

    const idx = this.sources.findIndex((s) => s.id === id);
    if (idx >= 0) {
      this.sources[idx] = fullSource;
    } else {
      this.sources.unshift(fullSource);
    }

    this.sources = dedupeArrayById(this.sources);
    this.saveToLocalStorage('sources', this.sources);
    this.persistToSupabase('research_sources', fullSource);
    this.logActivity(`Menyimpan sumber riset: ${fullSource.source_title}`);
    this.notify();
    return fullSource;
  }

  public deleteSource(id: string): boolean {
    const idx = this.sources.findIndex((s) => s.id === id);
    if (idx >= 0) {
      const removed = this.sources.splice(idx, 1)[0];
      this.saveToLocalStorage('sources', this.sources);
      this.deleteFromSupabase('research_sources', id);
      this.notify();
      return true;
    }
    return false;
  }

  // --- Storyboards ---
  public getStoryboardsByContentId(contentId: string): StoryboardScene[] {
    return dedupeArrayById(this.storyboards)
      .filter((s) => s.content_id === contentId)
      .sort((a, b) => a.scene_order - b.scene_order);
  }

  public saveStoryboardScene(scene: Partial<StoryboardScene> & { content_id: string }): StoryboardScene {
    const id = scene.id || generateUniqueId('sc');
    const existingIdx = this.storyboards.findIndex((s) => s.id === id);

    const fullScene: StoryboardScene = {
      id,
      content_id: scene.content_id,
      scene_order: scene.scene_order || (existingIdx >= 0 ? this.storyboards[existingIdx].scene_order : this.storyboards.length + 1),
      time_range: scene.time_range || '0–3s',
      narration_text: scene.narration_text || '',
      on_screen_text: scene.on_screen_text || '',
      visual_direction: scene.visual_direction || '',
      broll_type: scene.broll_type || '',
      visual_asset_url: scene.visual_asset_url,
    };

    if (existingIdx >= 0) {
      this.storyboards[existingIdx] = fullScene;
    } else {
      this.storyboards.push(fullScene);
    }

    this.storyboards = dedupeArrayById(this.storyboards);
    this.saveToLocalStorage('storyboards', this.storyboards);
    this.persistToSupabase('storyboard_scenes', fullScene);
    this.notify();
    return fullScene;
  }

  public deleteStoryboardScene(id: string): boolean {
    const idx = this.storyboards.findIndex((s) => s.id === id);
    if (idx >= 0) {
      this.storyboards.splice(idx, 1);
      this.saveToLocalStorage('storyboards', this.storyboards);
      this.deleteFromSupabase('storyboard_scenes', id);
      this.notify();
      return true;
    }
    return false;
  }

  // --- Production Checklists ---
  public getChecklist(contentId: string): ProductionChecklist {
    let chk = this.checklists.find((c) => c.content_id === contentId);
    if (!chk) {
      chk = {
        id: generateUniqueId('chk'),
        content_id: contentId,
        checklist_voiceover: false,
        checklist_broll: false,
        checklist_captions: false,
        checklist_audio: false,
        checklist_music: false,
        checklist_contrast: false,
        checklist_final: false,
        updated_at: new Date().toISOString(),
      };
      this.checklists.push(chk);
      this.checklists = dedupeArrayById(this.checklists);
      this.saveToLocalStorage('checklists', this.checklists);
    }
    return chk;
  }

  public updateChecklist(contentId: string, patch: Partial<ProductionChecklist>): ProductionChecklist {
    const current = this.getChecklist(contentId);
    const updated: ProductionChecklist = {
      ...current,
      ...patch,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const idx = this.checklists.findIndex((c) => c.content_id === contentId);
    if (idx >= 0) {
      this.checklists[idx] = updated;
    } else {
      this.checklists.push(updated);
    }

    this.checklists = dedupeArrayById(this.checklists);
    this.saveToLocalStorage('checklists', this.checklists);
    this.persistToSupabase('production_checklists', updated);
    this.notify();
    return updated;
  }

  // --- Media Assets ---
  public getAssets(): MediaAsset[] {
    return dedupeArrayById(this.assets);
  }

  public getAssetsByContentId(contentId: string): MediaAsset[] {
    return this.assets.filter((a) => a.content_id === contentId);
  }

  public saveAsset(asset: Partial<MediaAsset> & { id?: string }): MediaAsset {
    const id = asset.id || generateUniqueId('ast');
    const fullAsset: MediaAsset = {
      id,
      content_id: asset.content_id,
      asset_name: asset.asset_name || 'asset-file',
      asset_type: asset.asset_type || 'Screen recording',
      asset_url: asset.asset_url || '',
      file_size: asset.file_size || 0,
      storage_path: asset.storage_path || '',
      asset_tags: asset.asset_tags || [],
      asset_status: asset.asset_status || 'Ready',
      notes: asset.notes || '',
      created_at: asset.created_at || new Date().toISOString(),
    };

    const idx = this.assets.findIndex((a) => a.id === id);
    if (idx >= 0) {
      this.assets[idx] = fullAsset;
    } else {
      this.assets.unshift(fullAsset);
    }

    this.assets = dedupeArrayById(this.assets);
    this.saveToLocalStorage('assets', this.assets);
    this.persistToSupabase('media_assets', fullAsset);
    this.notify();
    return fullAsset;
  }

  public deleteAsset(id: string): boolean {
    const idx = this.assets.findIndex((a) => a.id === id);
    if (idx >= 0) {
      this.assets.splice(idx, 1);
      this.saveToLocalStorage('assets', this.assets);
      this.deleteFromSupabase('media_assets', id);
      this.notify();
      return true;
    }
    return false;
  }

  // --- Analytics Metrics ---
  public getMetrics(): AnalyticsMetric[] {
    return dedupeArrayById(this.metrics);
  }

  public saveMetric(metric: Partial<AnalyticsMetric> & { id?: string }): AnalyticsMetric {
    const id = metric.id || generateUniqueId('met');
    const fullMetric: AnalyticsMetric = {
      id,
      content_id: metric.content_id,
      title: metric.title || 'Untitled Video',
      pillar: metric.pillar || 'AI & Technology',
      format: metric.format || 'Quick Breakdown',
      views: Number(metric.views) || 0,
      shown_in_feed: Number(metric.shown_in_feed) || 0,
      stayed_to_watch: Number(metric.stayed_to_watch) || 0,
      avg_view_duration: Number(metric.avg_view_duration) || 0,
      apv: Number(metric.apv) || 0,
      likes: Number(metric.likes) || 0,
      subscribers: Number(metric.subscribers) || 0,
      traffic_source: metric.traffic_source || 'Shorts Feed (85%)',
      experiment_hypothesis: metric.experiment_hypothesis || '',
      experiment_variable: metric.experiment_variable || '',
      experiment_result: metric.experiment_result || '',
      experiment_next: metric.experiment_next || '',
      recorded_at: metric.recorded_at || new Date().toISOString(),
      created_at: metric.created_at || new Date().toISOString(),
    };

    const idx = this.metrics.findIndex((m) => m.id === id);
    if (idx >= 0) {
      this.metrics[idx] = fullMetric;
    } else {
      this.metrics.unshift(fullMetric);
    }

    this.metrics = dedupeArrayById(this.metrics);
    this.saveToLocalStorage('metrics', this.metrics);
    this.persistToSupabase('analytics_metrics', fullMetric);
    this.logActivity(`Mencatat analitik video: ${fullMetric.title}`);
    this.notify();
    return fullMetric;
  }

  public deleteMetric(id: string): boolean {
    const idx = this.metrics.findIndex((m) => m.id === id);
    if (idx >= 0) {
      this.metrics.splice(idx, 1);
      this.saveToLocalStorage('metrics', this.metrics);
      this.deleteFromSupabase('analytics_metrics', id);
      this.notify();
      return true;
    }
    return false;
  }

  // --- Trend Signals ---
  public getTrends(): TrendSignal[] {
    return dedupeArrayById(this.trends);
  }

  public updateTrendStatus(id: string, userStatus: TrendSignal['user_status'], notes?: string): void {
    const idx = this.trends.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.trends[idx] = {
        ...this.trends[idx],
        user_status: userStatus,
        saved_notes: notes ?? this.trends[idx].saved_notes,
      };
      this.trends = dedupeArrayById(this.trends);
      this.saveToLocalStorage('trends', this.trends);
      this.logActivity(`Memperbarui tren ${this.trends[idx].headline}: ${userStatus}`);
      this.notify();
    }
  }

  public addCustomTrend(trend: Partial<TrendSignal>): TrendSignal {
    const normalizedUrl = trend.url ? trend.url.trim().toLowerCase() : '';
    const normalizedHeadline = trend.headline ? trend.headline.trim().toLowerCase() : '';

    const existingIdx = this.trends.findIndex((t) => {
      if (trend.id && t.id === trend.id) return true;
      if (normalizedUrl && t.url && t.url.trim().toLowerCase() === normalizedUrl) return true;
      if (normalizedHeadline && t.headline && t.headline.trim().toLowerCase() === normalizedHeadline) return true;
      return false;
    });

    if (existingIdx >= 0) {
      const existing = this.trends[existingIdx];
      const updatedTrend: TrendSignal = {
        ...existing,
        ...trend,
        id: existing.id, // Preserve original unique ID
        relevance_score: trend.relevance_score ?? existing.relevance_score,
        momentum_score: trend.momentum_score ?? existing.momentum_score,
        visual_score: trend.visual_score ?? existing.visual_score,
      };
      this.trends[existingIdx] = updatedTrend;
      this.trends = dedupeArrayById(this.trends);
      this.saveToLocalStorage('trends', this.trends);
      this.persistToSupabase('trend_signals', updatedTrend);
      this.notify();
      return updatedTrend;
    }

    let id = trend.id;
    if (!id || this.trends.some((t) => t.id === id)) {
      id = generateUniqueId('custom');
    }

    const fullTrend: TrendSignal = {
      id,
      source_platform: trend.source_platform || 'rss',
      source_name: trend.source_name || 'Custom Ingestion',
      source_type: trend.source_type || 'Newsroom',
      headline: trend.headline || 'Headline Baru',
      summary: trend.summary || '',
      url: trend.url || '',
      source_pub_date: trend.source_pub_date || new Date().toISOString().slice(0, 10),
      hours_ago: trend.hours_ago || 1,
      pillar: trend.pillar || 'AI & Technology',
      format_suggestion: trend.format_suggestion || 'Quick Breakdown',
      relevance_score: trend.relevance_score || 80,
      momentum_score: trend.momentum_score || 80,
      volume_level: trend.volume_level || 'Sedang',
      competition_level: trend.competition_level || 'Sedang',
      visual_score: trend.visual_score || 80,
      visual_asset_desc: trend.visual_asset_desc || 'Screenshot / Demo',
      question_title: trend.question_title || 'Apa yang Baru?',
      hook_suggestion: trend.hook_suggestion || '',
      rationale: trend.rationale || '',
      related_queries: trend.related_queries || [],
      trend_status: trend.trend_status || 'Rising',
      user_status: 'Belum dibaca',
      freshness: '24 jam',
    };

    this.trends.unshift(fullTrend);
    this.trends = dedupeArrayById(this.trends);
    this.saveToLocalStorage('trends', this.trends);
    this.persistToSupabase('trend_signals', fullTrend);
    this.notify();
    return fullTrend;
  }

  // --- RSS Feeds ---
  public getFeeds(): RssFeedSource[] {
    return dedupeArrayById(this.feeds);
  }

  public saveFeed(feed: Partial<RssFeedSource> & { feed_name: string; feed_url: string }): RssFeedSource {
    const id = feed.id || generateUniqueId('feed');
    const fullFeed: RssFeedSource = {
      id,
      feed_name: feed.feed_name,
      feed_url: feed.feed_url,
      category: feed.category || 'Tech',
      is_active: feed.is_active !== undefined ? feed.is_active : true,
      last_fetched_at: new Date().toISOString(),
      fetch_status: feed.fetch_status || 'healthy',
      error_message: feed.error_message,
    };

    const idx = this.feeds.findIndex((f) => f.id === id || (feed.feed_url && f.feed_url === feed.feed_url));
    if (idx >= 0) {
      this.feeds[idx] = fullFeed;
    } else {
      this.feeds.push(fullFeed);
    }

    this.feeds = dedupeArrayById(this.feeds);
    this.saveToLocalStorage('feeds', this.feeds);
    this.notify();
    return fullFeed;
  }

  public deleteFeed(id: string): boolean {
    const idx = this.feeds.findIndex((f) => f.id === id);
    if (idx >= 0) {
      this.feeds.splice(idx, 1);
      this.saveToLocalStorage('feeds', this.feeds);
      this.notify();
      return true;
    }
    return false;
  }

  // --- AI Configurations ---
  public getAiConfigs(): AiConfig[] {
    return dedupeArrayById(this.aiConfigs);
  }

  public saveAiConfig(cfg: Partial<AiConfig> & { provider: AiConfig['provider'] }): AiConfig {
    const idx = this.aiConfigs.findIndex((c) => c.provider === cfg.provider);
    if (idx >= 0) {
      this.aiConfigs[idx] = {
        ...this.aiConfigs[idx],
        ...cfg,
      };
      this.saveToLocalStorage('ai_configs', this.aiConfigs);
      this.notify();
      return this.aiConfigs[idx];
    }
    throw new Error(`Provider ${cfg.provider} not found`);
  }

  public trackAiUsage(provider: AiConfig['provider'], tokens: number, costUsd: number) {
    const idx = this.aiConfigs.findIndex((c) => c.provider === provider);
    if (idx >= 0) {
      this.aiConfigs[idx].totalTokensUsed += tokens;
      this.aiConfigs[idx].estimatedCostUsd += costUsd;
      this.saveToLocalStorage('ai_configs', this.aiConfigs);
      this.notify();
    }
  }

  // --- Filter Presets ---
  public getPresets(): FilterPreset[] {
    return dedupeArrayById(this.presets);
  }

  public savePreset(preset: Omit<FilterPreset, 'id' | 'created_at'>): FilterPreset {
    const newPreset: FilterPreset = {
      ...preset,
      id: generateUniqueId('p'),
      created_at: new Date().toISOString(),
    };
    this.presets.push(newPreset);
    this.presets = dedupeArrayById(this.presets);
    this.saveToLocalStorage('presets', this.presets);
    this.notify();
    return newPreset;
  }

  public deletePreset(id: string): boolean {
    const idx = this.presets.findIndex((p) => p.id === id);
    if (idx >= 0) {
      this.presets.splice(idx, 1);
      this.saveToLocalStorage('presets', this.presets);
      this.notify();
      return true;
    }
    return false;
  }

  // --- Undo System ---
  public undoLastAction(): boolean {
    const item = this.undoStack.pop();
    if (!item) return false;

    if (item.action === 'delete') {
      if (item.type === 'content_items') {
        this.contentItems.unshift(item.payload);
        this.contentItems = dedupeArrayById(this.contentItems);
        this.saveToLocalStorage('content_items', this.contentItems);
      } else if (item.type === 'ideas') {
        this.ideas.unshift(item.payload);
        this.ideas = dedupeArrayById(this.ideas);
        this.saveToLocalStorage('ideas', this.ideas);
      }
      this.notify();
      return true;
    }

    if (item.action === 'update') {
      if (item.type === 'content') {
        const idx = this.contentItems.findIndex((c) => c.id === item.payload.id);
        if (idx >= 0) this.contentItems[idx] = item.payload;
        this.contentItems = dedupeArrayById(this.contentItems);
        this.saveToLocalStorage('content_items', this.contentItems);
      } else if (item.type === 'idea') {
        const idx = this.ideas.findIndex((i) => i.id === item.payload.id);
        if (idx >= 0) this.ideas[idx] = item.payload;
        this.ideas = dedupeArrayById(this.ideas);
        this.saveToLocalStorage('ideas', this.ideas);
      }
      this.notify();
      return true;
    }

    if (item.action === 'create') {
      if (item.type === 'content') {
        const idx = this.contentItems.findIndex((c) => c.id === item.payload.id);
        if (idx >= 0) this.contentItems.splice(idx, 1);
        this.contentItems = dedupeArrayById(this.contentItems);
        this.saveToLocalStorage('content_items', this.contentItems);
        this.deleteFromSupabase('content_items', item.payload.id);
      } else if (item.type === 'idea') {
        const idx = this.ideas.findIndex((i) => i.id === item.payload.id);
        if (idx >= 0) this.ideas.splice(idx, 1);
        this.ideas = dedupeArrayById(this.ideas);
        this.saveToLocalStorage('ideas', this.ideas);
        this.deleteFromSupabase('content_items', item.payload.id);
      }
      this.notify();
      return true;
    }

    return false;
  }

  // --- Script Versions ---
  public getScriptVersions(contentId: string): ScriptVersion[] {
    return dedupeArrayById(this.scriptVersions)
      .filter((v) => v.content_id === contentId)
      .sort((a, b) => b.version_number - a.version_number);
  }

  public saveScriptVersion(version: Partial<ScriptVersion> & { content_id: string }): ScriptVersion {
    const existingForContent = this.getScriptVersions(version.content_id);
    const versionNumber =
      version.version_number ||
      (existingForContent.length > 0 ? existingForContent[0].version_number + 1 : 1);
    const id = version.id || generateUniqueId(`ver-${version.content_id}`);
    const now = new Date().toISOString();

    const isActive = version.is_active !== undefined ? version.is_active : true;
    if (isActive) {
      this.scriptVersions.forEach((v) => {
        if (v.content_id === version.content_id) {
          v.is_active = false;
        }
      });
    }

    const fullVersion: ScriptVersion = {
      id,
      content_id: version.content_id,
      version_number: versionNumber,
      title: version.title || 'Untitled Script Version',
      format: version.format || 'Quick Breakdown',
      target_wpm: version.target_wpm || 145,
      script_hook: version.script_hook || '',
      script_context: version.script_context || '',
      script_payoff: version.script_payoff || '',
      script_ending: version.script_ending || '',
      word_count: version.word_count || 0,
      duration_estimate: version.duration_estimate || 0,
      is_active: isActive,
      created_at: version.created_at || now,
    };

    const idx = this.scriptVersions.findIndex((v) => v.id === id);
    if (idx >= 0) {
      this.scriptVersions[idx] = fullVersion;
    } else {
      this.scriptVersions.unshift(fullVersion);
    }

    this.scriptVersions = dedupeArrayById(this.scriptVersions);
    this.saveToLocalStorage('script_versions', this.scriptVersions);
    this.persistToSupabase('script_versions', fullVersion);
    this.logActivity(`Menyimpan revisi naskah v${fullVersion.version_number}: ${fullVersion.title}`);
    this.notify();
    return fullVersion;
  }

  public restoreScriptVersion(versionId: string): ScriptVersion | null {
    const version = this.scriptVersions.find((v) => v.id === versionId);
    if (!version) return null;

    // Set this version as active
    this.scriptVersions.forEach((v) => {
      if (v.content_id === version.content_id) {
        v.is_active = v.id === versionId;
      }
    });

    // Update parent content item
    const content = this.getContentById(version.content_id);
    if (content) {
      this.saveContentItem({
        ...content,
        title: version.title,
        format: version.format,
        target_wpm: version.target_wpm,
        script_hook: version.script_hook,
        script_context: version.script_context,
        script_payoff: version.script_payoff,
        script_ending: version.script_ending,
        word_count: version.word_count,
        duration_estimate: version.duration_estimate,
      });
    }

    this.saveToLocalStorage('script_versions', this.scriptVersions);
    this.logActivity(`Memulihkan naskah ke revisi v${version.version_number}`);
    this.notify();
    return version;
  }

  // --- Supabase Hybrid Adapter Methods ---
  private async initSupabaseSync() {
    if (typeof window === 'undefined' || !isSupabaseConfigured() || !supabase) return;
    try {
      // 1. Sync Content Items & Ideas
      const { data: remoteItems, error: itemsErr } = await supabase.from('content_items').select('*');
      if (!itemsErr && remoteItems && Array.isArray(remoteItems) && remoteItems.length > 0) {
        const localContentMap = new Map(this.contentItems.map((c, i) => [c.id, { item: c, index: i }]));
        const localIdeaMap = new Map(this.ideas.map((c, i) => [c.id, { item: c, index: i }]));

        for (const item of remoteItems) {
          if (item.type === 'idea') {
            const existing = localIdeaMap.get(item.id);
            if (existing) {
              if (item.updated_at && (!existing.item.updated_at || item.updated_at > existing.item.updated_at)) {
                this.ideas[existing.index] = item;
              }
            } else {
              this.ideas.push(item);
            }
          } else {
            const existing = localContentMap.get(item.id);
            if (existing) {
              if (item.updated_at && (!existing.item.updated_at || item.updated_at > existing.item.updated_at)) {
                this.contentItems[existing.index] = item;
              }
            } else {
              this.contentItems.push(item);
            }
          }
        }
        this.contentItems = dedupeArrayById(this.contentItems);
        this.ideas = dedupeArrayById(this.ideas);
        this.saveToLocalStorage('content_items', this.contentItems);
        this.saveToLocalStorage('ideas', this.ideas);
      }

      // 2. Sync Script Versions
      const { data: remoteVersions, error: verErr } = await supabase.from('script_versions').select('*');
      if (!verErr && remoteVersions && Array.isArray(remoteVersions) && remoteVersions.length > 0) {
        const localVerMap = new Set(this.scriptVersions.map((v) => v.id));
        for (const v of remoteVersions) {
          if (!localVerMap.has(v.id)) {
            this.scriptVersions.push(v);
          }
        }
        this.scriptVersions = dedupeArrayById(this.scriptVersions);
        this.saveToLocalStorage('script_versions', this.scriptVersions);
      }

      // 3. Sync Research Sources
      const { data: remoteSources, error: srcErr } = await supabase.from('research_sources').select('*');
      if (!srcErr && remoteSources && Array.isArray(remoteSources) && remoteSources.length > 0) {
        const localSrcMap = new Set(this.sources.map((s) => s.id));
        for (const s of remoteSources) {
          if (!localSrcMap.has(s.id)) {
            this.sources.push(s);
          }
        }
        this.sources = dedupeArrayById(this.sources);
        this.saveToLocalStorage('sources', this.sources);
      }

      // 4. Sync Storyboard Scenes
      const { data: remoteScenes, error: sceneErr } = await supabase.from('storyboard_scenes').select('*');
      if (!sceneErr && remoteScenes && Array.isArray(remoteScenes) && remoteScenes.length > 0) {
        const localSceneMap = new Set(this.storyboards.map((sc) => sc.id));
        for (const sc of remoteScenes) {
          if (!localSceneMap.has(sc.id)) {
            this.storyboards.push(sc);
          }
        }
        this.storyboards = dedupeArrayById(this.storyboards);
        this.saveToLocalStorage('storyboards', this.storyboards);
      }

      // 5. Sync Production Checklists
      const { data: remoteChecklists, error: chkErr } = await supabase.from('production_checklists').select('*');
      if (!chkErr && remoteChecklists && Array.isArray(remoteChecklists) && remoteChecklists.length > 0) {
        const localChkMap = new Map(this.checklists.map((c, i) => [c.content_id, i]));
        for (const chk of remoteChecklists) {
          const idx = localChkMap.get(chk.content_id);
          if (idx !== undefined) {
            this.checklists[idx] = chk;
          } else {
            this.checklists.push(chk);
          }
        }
        this.checklists = dedupeArrayById(this.checklists);
        this.saveToLocalStorage('checklists', this.checklists);
      }

      // 6. Sync Media Assets
      const { data: remoteAssets, error: astErr } = await supabase.from('media_assets').select('*');
      if (!astErr && remoteAssets && Array.isArray(remoteAssets) && remoteAssets.length > 0) {
        const localAssetMap = new Set(this.assets.map((a) => a.id));
        for (const a of remoteAssets) {
          if (!localAssetMap.has(a.id)) {
            this.assets.push(a);
          }
        }
        this.assets = dedupeArrayById(this.assets);
        this.saveToLocalStorage('assets', this.assets);
      }

      // 7. Sync Analytics Metrics
      const { data: remoteMetrics, error: metErr } = await supabase.from('analytics_metrics').select('*');
      if (!metErr && remoteMetrics && Array.isArray(remoteMetrics) && remoteMetrics.length > 0) {
        const localMetMap = new Set(this.metrics.map((m) => m.id));
        for (const m of remoteMetrics) {
          if (!localMetMap.has(m.id)) {
            this.metrics.push(m);
          }
        }
        this.metrics = dedupeArrayById(this.metrics);
        this.saveToLocalStorage('metrics', this.metrics);
      }

      // 8. Sync Trend Signals
      const { data: remoteTrends, error: trendErr } = await supabase.from('trend_signals').select('*');
      if (!trendErr && remoteTrends && Array.isArray(remoteTrends) && remoteTrends.length > 0) {
        const localTrendMap = new Set(this.trends.map((t) => t.id));
        for (const t of remoteTrends) {
          if (!localTrendMap.has(t.id)) {
            this.trends.push(t);
          }
        }
        this.trends = dedupeArrayById(this.trends);
        this.saveToLocalStorage('trends', this.trends);
      }

      this.notify();
    } catch (err: any) {
      console.warn('[Supabase Hybrid Sync notice]:', err?.message || err);
    }
  }

  private async persistToSupabase(table: string, payload: any) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from(table).upsert(payload);
      if (error) {
        console.warn(`[Supabase Hybrid Adapter] Failed to upsert ${table}:`, error.message || error);
      }
    } catch (err: any) {
      console.warn(`[Supabase Hybrid Adapter Exception] ${table}:`, err?.message || err);
    }
  }

  private async deleteFromSupabase(table: string, id: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        console.warn(`[Supabase Hybrid Adapter] Failed to delete from ${table}:`, error.message || error);
      }
    } catch (err: any) {
      console.warn(`[Supabase Hybrid Adapter Exception] ${table}:`, err?.message || err);
    }
  }

  // --- Activity Log ---
  public getLogs(): ActivityLog[] {
    return dedupeArrayById(this.logs);
  }

  private logActivity(action: string, details?: string) {
    this.logs.unshift({
      id: generateUniqueId('log'),
      action,
      details: details || '',
      timestamp: new Date().toISOString(),
    });
    if (this.logs.length > 50) this.logs.pop();
    this.saveToLocalStorage('logs', this.logs);
  }
}

// Singleton store instance
export const studioStore = new StudioStore();
