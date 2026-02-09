-- Add new attribute columns for gown filtering
-- These expand the gown catalog to support 6-dimensional filtering

-- Add sleeve_style column
ALTER TABLE gowns ADD COLUMN IF NOT EXISTS sleeve_style TEXT;

-- Add train_length column
ALTER TABLE gowns ADD COLUMN IF NOT EXISTS train_length TEXT;

-- Add fabric column
ALTER TABLE gowns ADD COLUMN IF NOT EXISTS fabric TEXT;

-- Add aesthetic column (style/aesthetic of the gown)
ALTER TABLE gowns ADD COLUMN IF NOT EXISTS aesthetic TEXT;

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_gowns_sleeve_style ON gowns(sleeve_style);
CREATE INDEX IF NOT EXISTS idx_gowns_train_length ON gowns(train_length);
CREATE INDEX IF NOT EXISTS idx_gowns_fabric ON gowns(fabric);
CREATE INDEX IF NOT EXISTS idx_gowns_aesthetic ON gowns(aesthetic);

-- Add comment for documentation
COMMENT ON COLUMN gowns.sleeve_style IS 'Sleeve style: Sleeveless, Cap Sleeve, Short Sleeve, 3/4 Sleeve, Long Sleeve, Flutter/Bell Sleeve, Off-Shoulder Drape';
COMMENT ON COLUMN gowns.train_length IS 'Train length: No Train, Sweep, Court, Chapel, Cathedral, Monarch/Royal, Detachable';
COMMENT ON COLUMN gowns.fabric IS 'Primary fabric: Lace, Tulle, Satin, Silk, Chiffon, Crepe, Organza, Mikado, Taffeta, Glitter/Sequin, Mixed';
COMMENT ON COLUMN gowns.aesthetic IS 'Style aesthetic: Classic, Modern/Minimalist, Romantic, Bohemian, Glamorous, Vintage, Sexy/Bold, Modest, Whimsical';
