-- =====================================================================
-- ZEINITY CREATOR STUDIO — MULTI-FORMAT EXPANSION MIGRATION
-- Migration: 002_multi_format_expansion.sql
-- Description: Expand schema from Shorts-exclusive (<60s) to unified
--              multi-tier ecosystem (Shorts, Mid-Form, Long-Form).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DROP LEGACY FORMAT CHECK CONSTRAINTS
-- ---------------------------------------------------------------------
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_format_check;
ALTER TABLE script_versions DROP CONSTRAINT IF EXISTS script_versions_format_check;

-- ---------------------------------------------------------------------
-- 2. EXPAND CONTENT_ITEMS TABLE FOR MULTI-FORMAT & PACKAGING
-- ---------------------------------------------------------------------
ALTER TABLE content_items
    ADD COLUMN IF NOT EXISTS content_tier TEXT DEFAULT 'Shorts',
    ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '9:16',
    ADD COLUMN IF NOT EXISTS script_chapters JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS seo_meta_description TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS thumbnail_concept TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS monetization_goal TEXT DEFAULT '';

-- ---------------------------------------------------------------------
-- 3. EXPAND ANALYTICS_METRICS TABLE FOR DUAL BENCHMARKS
-- ---------------------------------------------------------------------
ALTER TABLE analytics_metrics
    ADD COLUMN IF NOT EXISTS content_tier TEXT DEFAULT 'Shorts',
    ADD COLUMN IF NOT EXISTS thumbnail_ctr NUMERIC(5, 2) DEFAULT NULL;

-- ---------------------------------------------------------------------
-- 4. ADD NEW CHECK CONSTRAINTS FOR ALL 11 FORMATS (Shorts 4, Mid 4, Long 3)
-- ---------------------------------------------------------------------
ALTER TABLE content_items
    ADD CONSTRAINT content_items_format_check CHECK (format IN (
        -- Shorts (4)
        'Flash News',
        'Quick Breakdown',
        'Actionable Tip',
        'Myth Buster',
        -- Mid-Form (4)
        'Deep Explainer',
        'Mini Tutorial',
        'Case Breakdown',
        'Video Essay',
        -- Long-Form (3)
        'Masterclass',
        'Case Investigation',
        'Ecosystem Review'
    ));

ALTER TABLE script_versions
    ADD CONSTRAINT script_versions_format_check CHECK (format IN (
        -- Shorts (4)
        'Flash News',
        'Quick Breakdown',
        'Actionable Tip',
        'Myth Buster',
        -- Mid-Form (4)
        'Deep Explainer',
        'Mini Tutorial',
        'Case Breakdown',
        'Video Essay',
        -- Long-Form (3)
        'Masterclass',
        'Case Investigation',
        'Ecosystem Review'
    ));

-- Optional tier and aspect ratio checks for data integrity
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_tier_check;
ALTER TABLE content_items
    ADD CONSTRAINT content_items_tier_check CHECK (content_tier IN (
        'Shorts', 'Mid-Form', 'Long-Form', 'short', 'mid', 'long'
    ));

ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_aspect_ratio_check;
ALTER TABLE content_items
    ADD CONSTRAINT content_items_aspect_ratio_check CHECK (aspect_ratio IN ('9:16', '16:9'));
