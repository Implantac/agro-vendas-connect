ALTER TABLE public.membership_requests
  ADD COLUMN IF NOT EXISTS gateway_payment_id text,
  ADD COLUMN IF NOT EXISTS checkout_url text;
UPDATE public.app_settings SET value = '{"enabled":true,"provider":"asaas"}'::jsonb WHERE key = 'payments_enabled';