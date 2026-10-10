// ZEINITY CREATOR STUDIO — DATA TYPES DEFINITIONS

export type Pillar =
  | 'Internet & Social Media'
  | 'AI & Technology'
  | 'Digital Economy & Consumer Culture'
  | 'Gaming & Digital Entertainment'
  | 'Modern Life & Human Behavior';

export type VideoFormat =
  | 'Flash News'
  | 'Quick Breakdown'
  | 'Actionable Tip'
  | 'Myth Buster';

export type EditorialStatus =
  | 'Ide'
  | 'Riset'
  | 'Penulisan'
  | 'Siap Produksi'
  | 'Editing'
  | 'Review'
  | 'Terjadwal'
  | 'Terbit';

export type VerificationStatus =
  | 'Belum Dicek'
  | 'Perlu Konfirmasi'
  | 'Terverifikasi'
  | 'Kedaluwarsa';

export type Priority = 'Tinggi' | 'Sedang' | 'Rendah';

export type VisualReadiness = 'Siap' | 'Perlu aset' | 'Belum dicek';

export type AssetType =
  | 'Screen recording'
  | 'Screenshot'
  | 'B-roll'
  | 'Audio'
  | 'Thumbnail frame'
  | 'Document';

export type AssetStatus = 'Ready' | 'Needs edit' | 'Draft';

export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter';

export type HealthStatus = 'ok' | 'error' | 'untested';

export interface ContentItem {
  id: string;
  type: 'content' | 'idea';
  title: string;
  pillar: Pillar;
  format: VideoFormat;
  status: EditorialStatus;
  priority: Priority;
  visual_readiness: VisualReadiness;
  hook?: string;
  script_hook?: string;
  script_context?: string;
  script_payoff?: string;
  script_ending?: string;
  word_count?: number;
  duration_estimate?: number;
  target_wpm?: number;
  publish_date?: string; // ISO string e.g. "2026-10-12T07:00:00+07:00"
  production_due?: string; // YYYY-MM-DD
  source_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchSource {
  id: string;
  content_id?: string;
  source_title: string;
  source_url: string;
  source_platform: string;
  source_pub_date?: string;
  source_checked_date?: string;
  claim: string;
  evidence_quote: string;
  conclusion?: string;
  verification_status: VerificationStatus;
  is_rumor?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ScriptVersion {
  id: string;
  content_id: string;
  version_number: number;
  title: string;
  format: VideoFormat;
  target_wpm: number;
  script_hook: string;
  script_context: string;
  script_payoff: string;
  script_ending: string;
  word_count: number;
  duration_estimate: number;
  is_active: boolean;
  created_at: string;
}

export interface StoryboardScene {
  id: string;
  content_id: string;
  scene_order: number;
  time_range: string; // e.g. "0–3s", "4–10s", "11–45s", "46–60s"
  narration_text: string;
  on_screen_text: string;
  visual_direction: string;
  broll_type: string;
  visual_asset_url?: string;
}

export interface MediaAsset {
  id: string;
  content_id?: string;
  asset_name: string;
  asset_type: AssetType;
  asset_url?: string;
  file_size?: number;
  storage_path?: string;
  asset_tags: string[];
  asset_status: AssetStatus;
  notes?: string;
  created_at: string;
}

export interface ProductionChecklist {
  id: string;
  content_id: string;
  checklist_voiceover: boolean;
  checklist_broll: boolean;
  checklist_captions: boolean;
  checklist_audio: boolean;
  checklist_music: boolean;
  checklist_contrast: boolean;
  checklist_final: boolean;
  last_checked_at?: string;
  notes?: string;
  updated_at: string;
}

export interface AnalyticsMetric {
  id: string;
  content_id?: string;
  title: string;
  pillar: Pillar;
  format: VideoFormat;
  views: number;
  shown_in_feed: number;
  stayed_to_watch: number; // Viewed %
  avg_view_duration: number; // in seconds
  apv: number; // Average Percentage Viewed %
  likes: number;
  subscribers: number;
  traffic_source?: string;
  experiment_hypothesis?: string;
  experiment_variable?: string;
  experiment_result?: string;
  experiment_next?: string;
  recorded_at: string;
  created_at: string;
}

export interface TrendSignal {
  id: string;
  external_id?: string;
  source_platform: 'rss' | 'youtube' | 'google';
  source_name: string;
  source_type: string;
  headline: string;
  summary: string;
  url: string;
  source_pub_date: string;
  hours_ago: number;
  pillar: Pillar;
  format_suggestion: VideoFormat;
  relevance_score: number;
  momentum_score: number;
  volume_level: 'Tinggi' | 'Sedang' | 'Rendah';
  competition_level: 'Tinggi' | 'Sedang' | 'Rendah';
  visual_score: number;
  visual_asset_desc: string;
  question_title: string;
  hook_suggestion: string;
  rationale: string;
  related_queries: string[];
  trend_status: 'Rising' | 'Stable' | 'Cooling';
  user_status: 'Belum dibaca' | 'Dibaca' | 'Tersimpan' | 'Dijadikan ide' | 'Diarsipkan';
  saved_notes?: string;
  saved_tags?: string;
  freshness: string; // e.g. "24 jam", "72 jam", "7 hari"
}

export interface RssFeedSource {
  id: string;
  feed_name: string;
  feed_url: string;
  category: string;
  is_active: boolean;
  last_fetched_at?: string;
  fetch_status: 'healthy' | 'warning' | 'error';
  error_message?: string;
}

export interface AiConfig {
  id: string;
  provider: AiProvider;
  name: string;
  apiKey: string;
  isActive: boolean;
  defaultModel: string;
  fastModel: string;
  reasoningModel: string;
  availableModels: string[];
  temperature: number;
  systemPrompt: string;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  lastHealthCheck?: string;
  healthStatus: HealthStatus;
  healthLatencyMs?: number;
  healthMessage?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  tab: 'rss' | 'youtube' | 'google' | 'pipeline';
  filters: Record<string, any>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}
