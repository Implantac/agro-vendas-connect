CREATE POLICY app_settings_anon_read_public ON public.app_settings
FOR SELECT TO anon
USING (key = 'payments_enabled');