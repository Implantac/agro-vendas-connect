DROP POLICY IF EXISTS privacy_requests_insert ON public.privacy_requests;
DROP POLICY IF EXISTS privacy_requests_insert_anon ON public.privacy_requests;
DROP POLICY IF EXISTS privacy_requests_insert_self ON public.privacy_requests;

CREATE POLICY privacy_requests_insert_anon
  ON public.privacy_requests FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY privacy_requests_insert_self
  ON public.privacy_requests FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS orders_parties_update ON public.orders;
DROP POLICY IF EXISTS orders_admin_update ON public.orders;

CREATE POLICY orders_admin_update
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_order_status(_order_id uuid, _status order_status)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
  uid uuid := auth.uid();
  admin boolean;
  allowed order_status[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  admin := public.is_admin();
  IF NOT admin AND uid <> o.buyer_id AND uid <> o.seller_id THEN
    RAISE EXCEPTION 'Sem permissão para alterar este pedido';
  END IF;

  IF o.status = _status THEN
    RETURN o;
  END IF;

  allowed := CASE o.status
    WHEN 'created' THEN ARRAY['awaiting_payment','cancelled']::order_status[]
    WHEN 'awaiting_payment' THEN ARRAY['paid','cancelled']::order_status[]
    WHEN 'paid' THEN ARRAY['in_delivery','cancelled']::order_status[]
    WHEN 'in_delivery' THEN ARRAY['completed','cancelled']::order_status[]
    ELSE ARRAY[]::order_status[]
  END;

  IF NOT (_status = ANY (allowed)) AND NOT admin THEN
    RAISE EXCEPTION 'Transição de % para % não permitida', o.status, _status;
  END IF;

  IF _status = 'paid' AND NOT admin THEN
    RAISE EXCEPTION 'A confirmação de pagamento é feita pela plataforma';
  END IF;

  UPDATE public.orders
     SET status = _status, updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  INSERT INTO public.order_events (order_id, actor_id, event_type, metadata_json)
  VALUES (_order_id, uid, 'status_' || _status::text, jsonb_build_object('admin', admin));

  RETURN o;
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_status(uuid, order_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, order_status) TO authenticated;