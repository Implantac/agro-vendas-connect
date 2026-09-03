ALTER TABLE public.proposals ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');
UPDATE public.proposals SET expires_at = created_at + interval '48 hours' WHERE expires_at IS NULL;