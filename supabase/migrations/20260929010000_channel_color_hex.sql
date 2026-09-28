-- Migration: Add color_hex to public.channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT '#3B82F6';

-- Update existing channels with default brand colors
UPDATE public.channels
SET color_hex = CASE
  WHEN LOWER(name) LIKE '%facebook%' OR LOWER(platform) = 'facebook' THEN '#1877F2'
  WHEN LOWER(name) LIKE '%youtube%' OR LOWER(platform) = 'youtube' THEN '#FF0000'
  WHEN LOWER(name) LIKE '%web%' OR LOWER(platform) = 'web' THEN '#059669'
  WHEN LOWER(name) LIKE '%tv%' OR LOWER(platform) = 'broadcast' THEN '#7C3AED'
  ELSE '#3B82F6'
END
WHERE color_hex IS NULL OR color_hex = '#3B82F6';
