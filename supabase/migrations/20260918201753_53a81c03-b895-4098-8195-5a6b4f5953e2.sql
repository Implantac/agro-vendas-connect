ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS listing_limit integer,
  ADD COLUMN IF NOT EXISTS machine_limit integer,
  ADD COLUMN IF NOT EXISTS commission_percent numeric,
  ADD COLUMN IF NOT EXISTS highlight_label text;