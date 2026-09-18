-- 1) app_settings: apenas chaves públicas para membros; resto só admin
DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings
  FOR SELECT TO authenticated
  USING (key IN ('commission_percent', 'payments_enabled') OR public.is_admin());

-- 2) listing_media: público só vê mídia de anúncios aprovados
DROP POLICY IF EXISTS listing_media_read ON public.listing_media;
CREATE POLICY listing_media_read ON public.listing_media
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_media.listing_id
      AND (l.status = 'approved' OR l.seller_id = auth.uid() OR public.is_admin())
  ));

-- 3) listing_price_history: aprovado, dono ou admin
DROP POLICY IF EXISTS listing_price_history_read ON public.listing_price_history;
CREATE POLICY listing_price_history_read ON public.listing_price_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_price_history.listing_id
      AND (l.status = 'approved' OR l.seller_id = auth.uid() OR public.is_admin())
  ));

-- 4) nenhuma função SECURITY DEFINER executável por visitantes anônimos
REVOKE EXECUTE ON FUNCTION public.log_system_event(text, text, text, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_approved() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_member_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.shares_deal_with(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_listing_view(uuid) FROM anon, PUBLIC;