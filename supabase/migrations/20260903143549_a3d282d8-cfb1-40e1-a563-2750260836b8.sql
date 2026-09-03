CREATE OR REPLACE FUNCTION public.shares_deal_with(_other uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals p
     WHERE (p.buyer_id = auth.uid() AND p.seller_id = _other)
        OR (p.seller_id = auth.uid() AND p.buyer_id = _other)
  ) OR EXISTS (
    SELECT 1 FROM public.conversations c
     WHERE (c.buyer_id = auth.uid() AND c.seller_id = _other)
        OR (c.seller_id = auth.uid() AND c.buyer_id = _other)
  ) OR EXISTS (
    SELECT 1 FROM public.orders o
     WHERE (o.buyer_id = auth.uid() AND o.seller_id = _other)
        OR (o.seller_id = auth.uid() AND o.buyer_id = _other)
  );
$$;

DROP POLICY IF EXISTS profiles_counterpart_select ON public.profiles;
CREATE POLICY profiles_counterpart_select ON public.profiles
FOR SELECT TO authenticated
USING (public.shares_deal_with(id));