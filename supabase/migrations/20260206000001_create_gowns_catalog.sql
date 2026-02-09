-- Migration: Create gowns catalog tables for AI-generated wedding dresses
-- Categorized by neckline type for the catalog

-- Neckline reference table
CREATE TABLE IF NOT EXISTS necklines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Main gowns table
CREATE TABLE IF NOT EXISTS gowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  neckline_id UUID REFERENCES necklines(id) NOT NULL,
  image_url TEXT NOT NULL,
  image_path TEXT,  -- Supabase Storage path
  style_tags TEXT[],  -- e.g., ['ballgown', 'lace', 'minimalist']
  silhouette TEXT,  -- e.g., 'A-line', 'Mermaid', 'Ballgown'
  ai_prompt TEXT,  -- Store the prompt used to generate
  is_pro BOOLEAN DEFAULT false,  -- Pro-only gown
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gowns_neckline ON gowns(neckline_id);
CREATE INDEX IF NOT EXISTS idx_gowns_silhouette ON gowns(silhouette);
CREATE INDEX IF NOT EXISTS idx_gowns_is_pro ON gowns(is_pro);

-- Enable Row Level Security
ALTER TABLE necklines ENABLE ROW LEVEL SECURITY;
ALTER TABLE gowns ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can read the catalog (public)
CREATE POLICY "Public read access to necklines" ON necklines
  FOR SELECT USING (true);

CREATE POLICY "Public read access to gowns" ON gowns
  FOR SELECT USING (true);

-- RLS Policies: Only service role can modify (for admin/generation scripts)
CREATE POLICY "Service role can insert necklines" ON necklines
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert gowns" ON gowns
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update gowns" ON gowns
  FOR UPDATE USING (true);

CREATE POLICY "Service role can delete gowns" ON gowns
  FOR DELETE USING (true);

-- Seed neckline reference data
INSERT INTO necklines (name, slug, description) VALUES
  ('Sweetheart', 'sweetheart', 'Heart-shaped neckline that dips at the center, creating a romantic silhouette'),
  ('V-Neck', 'v-neck', 'V-shaped plunge neckline that elongates the neck and torso'),
  ('Off-Shoulder', 'off-shoulder', 'Elegant neckline that sits below the shoulders, showcasing the collarbone'),
  ('Strapless', 'strapless', 'Classic straight-across neckline with no straps'),
  ('Halter', 'halter', 'Straps that wrap around the neck, leaving shoulders bare'),
  ('Illusion', 'illusion', 'Sheer fabric with embellishments creating a "barely there" look'),
  ('Scoop', 'scoop', 'Rounded U-shaped neckline, universally flattering'),
  ('Square', 'square', 'Straight horizontal neckline with right angles at the corners'),
  ('High Neck', 'high-neck', 'Elegant neckline that covers the collarbone and neck'),
  ('Bateau', 'bateau', 'Wide boat-shaped neckline that follows the collarbone from shoulder to shoulder')
ON CONFLICT (slug) DO NOTHING;
