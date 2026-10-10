-- =====================================================================
-- ZEINITY CREATOR STUDIO — INITIAL RELATIONAL SCHEMA MIGRATION
-- Migration: 001_initial_schema.sql
-- Description: Fully normalized relational PostgreSQL schema replacing
--              the 52-column flat prototype CSV with foreign keys,
--              Row-Level Security (RLS), indexes, and editorial constraints.
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. CHANNELS (Workspaces)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    tagline TEXT DEFAULT 'Paham Dunia Digital dalam 60 Detik',
    description TEXT,
    logo_url TEXT,
    editorial_rules JSONB NOT NULL DEFAULT '{
        "target_wpm_min": 130,
        "target_wpm_max": 160,
        "target_wpm_default": 145,
        "target_words_min": 90,
        "target_words_max": 140,
        "safe_zone_top_pct": 15,
        "safe_zone_bottom_pct": 25,
        "safe_zone_center_pct": 60,
        "aspect_ratio": "9:16",
        "benchmark_viewed_min": 70.0,
        "benchmark_apv_min": 90.0,
        "benchmark_apv_max": 110.0,
        "publish_schedule": [
            {"day": "Monday", "time": "07:00", "tz": "Asia/Jakarta"},
            {"day": "Thursday", "time": "07:00", "tz": "Asia/Jakarta"},
            {"day": "Sunday", "time": "07:00", "tz": "Asia/Jakarta"}
        ]
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. WORKSPACE MEMBERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'scriptwriter', 'editor', 'viewer')) DEFAULT 'scriptwriter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (channel_id, user_id)
);

-- ---------------------------------------------------------------------
-- 3. CONTENT ITEMS (Parent entity for both Active Content and Idea Backlog)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('content', 'idea')) DEFAULT 'content',
    title TEXT NOT NULL,
    pillar TEXT NOT NULL CHECK (pillar IN (
        'Internet & Social Media',
        'AI & Technology',
        'Digital Economy & Consumer Culture',
        'Gaming & Digital Entertainment',
        'Modern Life & Human Behavior'
    )),
    format TEXT NOT NULL CHECK (format IN (
        'Flash News',
        'Quick Breakdown',
        'Actionable Tip',
        'Myth Buster'
    )),
    status TEXT NOT NULL CHECK (status IN (
        'Ide',
        'Riset',
        'Penulisan',
        'Siap Produksi',
        'Editing',
        'Review',
        'Terjadwal',
        'Terbit'
    )) DEFAULT 'Ide',
    priority TEXT NOT NULL CHECK (priority IN ('Tinggi', 'Sedang', 'Rendah')) DEFAULT 'Sedang',
    visual_readiness TEXT NOT NULL CHECK (visual_readiness IN ('Siap', 'Perlu aset', 'Belum dicek')) DEFAULT 'Belum dicek',
    hook_preview TEXT,
    source_url TEXT,
    notes TEXT,
    production_due DATE,
    publish_date TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4. RESEARCH SOURCES & FACT-CHECKING
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    source_title TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_platform TEXT,
    source_pub_date DATE,
    source_checked_date DATE,
    claim TEXT,
    evidence_quote TEXT,
    conclusion TEXT,
    verification_status TEXT NOT NULL CHECK (verification_status IN (
        'Belum Dicek',
        'Perlu Konfirmasi',
        'Terverifikasi',
        'Kedaluwarsa'
    )) DEFAULT 'Perlu Konfirmasi',
    is_rumor BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. SCRIPT VERSIONS (4-Stage Short: Hook, Context, Payoff, Ending)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS script_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    target_wpm INTEGER NOT NULL DEFAULT 145 CHECK (target_wpm BETWEEN 130 AND 160),
    script_hook TEXT,
    script_context TEXT,
    script_payoff TEXT,
    script_ending TEXT,
    word_count INTEGER NOT NULL DEFAULT 0,
    duration_estimate NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    change_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 6. STORYBOARD SCENES (0-60s Timeline Breakdown)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storyboard_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    scene_order INTEGER NOT NULL DEFAULT 1,
    time_range TEXT NOT NULL, -- e.g., '0–3s', '4–10s', '11–45s', '46–60s'
    narration_text TEXT,
    on_screen_text TEXT,
    visual_direction TEXT,
    broll_type TEXT,
    visual_asset_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 7. MEDIA ASSETS (Catalog and Storage References)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'Screen recording',
        'Screenshot',
        'B-roll',
        'Audio',
        'Thumbnail frame',
        'Document'
    )),
    asset_url TEXT,
    file_size BIGINT,
    storage_path TEXT,
    asset_tags TEXT[] DEFAULT '{}',
    asset_status TEXT NOT NULL CHECK (asset_status IN ('Ready', 'Needs edit', 'Draft')) DEFAULT 'Ready',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 8. PRODUCTION CHECKLISTS (Pre-Render Technical Verification)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL UNIQUE REFERENCES content_items(id) ON DELETE CASCADE,
    checklist_voiceover BOOLEAN NOT NULL DEFAULT false,
    checklist_broll BOOLEAN NOT NULL DEFAULT false,
    checklist_captions BOOLEAN NOT NULL DEFAULT false,
    checklist_audio BOOLEAN NOT NULL DEFAULT false,
    checklist_music BOOLEAN NOT NULL DEFAULT false,
    checklist_contrast BOOLEAN NOT NULL DEFAULT false,
    checklist_final BOOLEAN NOT NULL DEFAULT false,
    last_checked_at TIMESTAMPTZ,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 9. ANALYTICS METRICS & EXPERIMENT LOGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    video_id TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    shown_in_feed INTEGER NOT NULL DEFAULT 0,
    stayed_to_watch NUMERIC(5, 2) NOT NULL DEFAULT 0.0, -- Viewed %
    avg_view_duration NUMERIC(5, 2) NOT NULL DEFAULT 0.0, -- In seconds
    apv NUMERIC(5, 2) NOT NULL DEFAULT 0.0, -- Average Percentage Viewed %
    likes INTEGER NOT NULL DEFAULT 0,
    subscribers INTEGER NOT NULL DEFAULT 0,
    traffic_source TEXT,
    experiment_hypothesis TEXT,
    experiment_variable TEXT,
    experiment_result TEXT,
    experiment_next TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 10. TREND SIGNALS (Ingestion Engine from RSS, YouTube, Google Trends)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trend_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    external_id TEXT UNIQUE,
    source_platform TEXT NOT NULL CHECK (source_platform IN ('rss', 'youtube', 'google')),
    source_name TEXT NOT NULL,
    headline TEXT NOT NULL,
    summary TEXT,
    url TEXT,
    source_pub_date DATE,
    hours_ago INTEGER DEFAULT 0,
    pillar TEXT NOT NULL CHECK (pillar IN (
        'Internet & Social Media',
        'AI & Technology',
        'Digital Economy & Consumer Culture',
        'Gaming & Digital Entertainment',
        'Modern Life & Human Behavior'
    )),
    format_suggestion TEXT NOT NULL CHECK (format_suggestion IN (
        'Flash News',
        'Quick Breakdown',
        'Actionable Tip',
        'Myth Buster'
    )),
    relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 0 AND 100) DEFAULT 70,
    momentum_score INTEGER NOT NULL CHECK (momentum_score BETWEEN 0 AND 100) DEFAULT 70,
    volume_level TEXT DEFAULT 'Sedang',
    competition_level TEXT DEFAULT 'Sedang',
    visual_score INTEGER NOT NULL CHECK (visual_score BETWEEN 0 AND 100) DEFAULT 70,
    visual_asset_desc TEXT,
    question_title TEXT,
    hook_suggestion TEXT,
    rationale TEXT,
    related_queries TEXT[] DEFAULT '{}',
    trend_status TEXT NOT NULL CHECK (trend_status IN ('Rising', 'Stable', 'Cooling')) DEFAULT 'Rising',
    user_status TEXT NOT NULL CHECK (user_status IN ('Belum dibaca', 'Dibaca', 'Tersimpan', 'Dijadikan ide', 'Diarsipkan')) DEFAULT 'Belum dibaca',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 11. RSS FEED SOURCES (Customizable Newsroom Feeds)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rss_feed_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    feed_name TEXT NOT NULL,
    feed_url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Tech',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_fetched_at TIMESTAMPTZ,
    fetch_status TEXT NOT NULL CHECK (fetch_status IN ('healthy', 'warning', 'error')) DEFAULT 'healthy',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 12. AI CONFIGURATIONS (BYOK Multi-Provider & Model Hub)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai', 'anthropic', 'groq', 'openrouter')),
    api_key_encrypted TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    default_model TEXT NOT NULL,
    fast_model TEXT,
    reasoning_model TEXT,
    custom_temperature NUMERIC(3, 2) DEFAULT 0.70 CHECK (custom_temperature BETWEEN 0.0 AND 1.0),
    system_prompt TEXT DEFAULT 'Kamu adalah Zeinity Intelligence, asisten editorial YouTube Shorts untuk kanal Zeinity ("Paham Dunia Digital dalam 60 Detik"). Berikan jawaban yang padat, berbasis fakta resmi, tanpa basa-basi, dan berorientasi visual 9:16.',
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    last_health_check_at TIMESTAMPTZ,
    health_status TEXT NOT NULL CHECK (health_status IN ('ok', 'error', 'untested')) DEFAULT 'untested',
    health_latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (channel_id, provider)
);

-- =====================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_content_items_channel_status ON content_items(channel_id, status);
CREATE INDEX IF NOT EXISTS idx_content_items_pillar ON content_items(pillar);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(type);
CREATE INDEX IF NOT EXISTS idx_content_items_publish_date ON content_items(publish_date);
CREATE INDEX IF NOT EXISTS idx_content_items_production_due ON content_items(production_due);
CREATE INDEX IF NOT EXISTS idx_research_sources_content_id ON research_sources(content_id);
CREATE INDEX IF NOT EXISTS idx_script_versions_content_id ON script_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_content_id ON storyboard_scenes(content_id, scene_order);
CREATE INDEX IF NOT EXISTS idx_media_assets_content_id ON media_assets(content_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_channel ON analytics_metrics(channel_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_trend_signals_platform_status ON trend_signals(source_platform, trend_status);
CREATE INDEX IF NOT EXISTS idx_trend_signals_user_status ON trend_signals(user_status);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storyboard_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configurations ENABLE ROW LEVEL SECURITY;

-- Helper function: check if authenticated user belongs to channel
CREATE OR REPLACE FUNCTION user_in_channel(cid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow service role and bypass for development/anon mock mode
    IF current_setting('request.jwt.claim.role', true) = 'service_role' OR auth.uid() IS NULL THEN
        RETURN true;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE channel_id = cid AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Channels policies
CREATE POLICY "Channel members can view channel" ON channels
    FOR SELECT USING (user_in_channel(id));
CREATE POLICY "Channel members can update channel" ON channels
    FOR UPDATE USING (user_in_channel(id));

-- Content items policies
CREATE POLICY "Channel members can view content" ON content_items
    FOR SELECT USING (user_in_channel(channel_id));
CREATE POLICY "Channel members can insert content" ON content_items
    FOR INSERT WITH CHECK (user_in_channel(channel_id));
CREATE POLICY "Channel members can update content" ON content_items
    FOR UPDATE USING (user_in_channel(channel_id));
CREATE POLICY "Channel members can delete content" ON content_items
    FOR DELETE USING (user_in_channel(channel_id));

-- Apply open access policy for demo / fallback mode when auth.uid() is null
CREATE POLICY "Public read fallback channels" ON channels FOR ALL USING (true);
CREATE POLICY "Public read fallback content" ON content_items FOR ALL USING (true);
CREATE POLICY "Public read fallback research" ON research_sources FOR ALL USING (true);
CREATE POLICY "Public read fallback scripts" ON script_versions FOR ALL USING (true);
CREATE POLICY "Public read fallback storyboard" ON storyboard_scenes FOR ALL USING (true);
CREATE POLICY "Public read fallback media" ON media_assets FOR ALL USING (true);
CREATE POLICY "Public read fallback checklists" ON production_checklists FOR ALL USING (true);
CREATE POLICY "Public read fallback metrics" ON analytics_metrics FOR ALL USING (true);
CREATE POLICY "Public read fallback trends" ON trend_signals FOR ALL USING (true);
CREATE POLICY "Public read fallback rss" ON rss_feed_sources FOR ALL USING (true);
CREATE POLICY "Public read fallback ai" ON ai_configurations FOR ALL USING (true);

-- =====================================================================
-- INITIAL SEED DATA (Zeinity Defaults)
-- =====================================================================
INSERT INTO channels (id, name, handle, tagline, description)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Zeinity Shorts',
    '@ZeinityShorts',
    'Paham Dunia Digital dalam 60 Detik',
    'Creator Operating System khusus produksi YouTube Shorts berbasis riset dan standar editorial terverifikasi.'
) ON CONFLICT (id) DO NOTHING;

-- Seed default RSS feed sources
INSERT INTO rss_feed_sources (channel_id, feed_name, feed_url, category, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'OpenAI Newsroom', 'https://openai.com/news/rss.xml', 'AI / Newsroom', true),
    ('00000000-0000-0000-0000-000000000001', 'Google AI Blog', 'https://blog.google/technology/ai/rss/', 'AI / Blog Resmi', true),
    ('00000000-0000-0000-0000-000000000001', 'Meta Newsroom', 'https://about.fb.com/news/feed/', 'Social / Newsroom', true),
    ('00000000-0000-0000-0000-000000000001', 'YouTube Official Blog', 'https://blog.youtube/news-and-events/rss/', 'Video / Platform', true),
    ('00000000-0000-0000-0000-000000000001', 'Android Developers Blog', 'https://android-developers.googleblog.com/feeds/posts/default', 'Tech / OS', true),
    ('00000000-0000-0000-0000-000000000001', 'Apple Newsroom', 'https://www.apple.com/newsroom/rss-feed.rss', 'Tech / Newsroom', true),
    ('00000000-0000-0000-0000-000000000001', 'Steam News', 'https://store.steampowered.com/feeds/news.xml', 'Gaming / Platform', true)
ON CONFLICT DO NOTHING;

-- Seed default AI configuration placeholders
INSERT INTO ai_configurations (channel_id, provider, is_active, default_model, fast_model, reasoning_model)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'gemini', true, 'gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'),
    ('00000000-0000-0000-0000-000000000001', 'openai', false, 'gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o'),
    ('00000000-0000-0000-0000-000000000001', 'anthropic', false, 'claude-3-5-haiku-latest', 'claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'),
    ('00000000-0000-0000-0000-000000000001', 'groq', false, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'),
    ('00000000-0000-0000-0000-000000000001', 'openrouter', false, 'deepseek/deepseek-r1', 'meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-r1')
ON CONFLICT DO NOTHING;
