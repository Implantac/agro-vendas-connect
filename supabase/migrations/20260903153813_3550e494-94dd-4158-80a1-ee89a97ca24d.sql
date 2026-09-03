DO $$
DECLARE demo uuid[];
BEGIN
  SELECT array_agg(id) INTO demo FROM public.listings
  WHERE created_at = timestamptz '2026-09-02 01:15:15.62556+00';

  IF demo IS NULL THEN RETURN; END IF;

  DELETE FROM public.order_events WHERE order_id IN (SELECT id FROM public.orders WHERE listing_id = ANY(demo));
  DELETE FROM public.orders WHERE listing_id = ANY(demo);
  DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE listing_id = ANY(demo));
  DELETE FROM public.conversations WHERE listing_id = ANY(demo);
  DELETE FROM public.proposals WHERE listing_id = ANY(demo);
  DELETE FROM public.favorites WHERE listing_id = ANY(demo);
  DELETE FROM public.reports WHERE listing_id = ANY(demo);
  DELETE FROM public.listing_media WHERE listing_id = ANY(demo);
  DELETE FROM public.listings WHERE id = ANY(demo);
END $$;