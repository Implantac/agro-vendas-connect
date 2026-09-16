-- Todo membro aprovado pode comprar e vender: remove a exigência de papel "seller".
DROP POLICY IF EXISTS listings_seller_insert ON public.listings;
CREATE POLICY listings_seller_insert ON public.listings
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND public.is_approved());

DROP POLICY IF EXISTS machines_owner_insert ON public.machines;
CREATE POLICY machines_owner_insert ON public.machines
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_approved());