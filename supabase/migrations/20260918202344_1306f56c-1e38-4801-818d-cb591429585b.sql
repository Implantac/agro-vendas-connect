DROP POLICY IF EXISTS listing_media_read ON public.listing_media;

CREATE POLICY listing_media_anon_read ON public.listing_media
FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.listings l
  WHERE l.id = listing_media.listing_id AND l.status = 'approved'::listing_status
));

CREATE POLICY listing_media_auth_read ON public.listing_media
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.listings l
  WHERE l.id = listing_media.listing_id
    AND (l.status = 'approved'::listing_status OR l.seller_id = auth.uid() OR public.is_admin())
));