ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'machines_availability_check'
  ) THEN
    ALTER TABLE public.machines
      ADD CONSTRAINT machines_availability_check
      CHECK (availability IN ('available','negotiating','sold','unavailable'));
  END IF;
END $$;