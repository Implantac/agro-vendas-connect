-- 1) Categoria nos eventos do sistema
ALTER TABLE public.system_events
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system';

CREATE INDEX IF NOT EXISTS system_events_category_idx ON public.system_events (category, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_system_event(
  _severity text,
  _source text,
  _message text,
  _context jsonb DEFAULT '{}'::jsonb,
  _category text DEFAULT 'system'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _recent int;
  _cat text;
BEGIN
  IF _severity NOT IN ('info','warning','error','critical') THEN
    _severity := 'error';
  END IF;

  _cat := coalesce(_category, 'system');
  IF _cat NOT IN ('auth','payment','membership','listing','machine','proposal',
                  'negotiation','order','document','lgpd','security','system') THEN
    _cat := 'system';
  END IF;

  SELECT count(*) INTO _recent
  FROM public.system_events
  WHERE created_at > now() - interval '5 minutes'
    AND user_id IS NOT DISTINCT FROM auth.uid();

  IF _recent > 60 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.system_events (severity, source, message, context, user_id, category)
  VALUES (
    _severity,
    left(coalesce(_source, 'app'), 120),
    left(coalesce(_message, ''), 2000),
    coalesce(_context, '{}'::jsonb),
    auth.uid(),
    _cat
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_system_event(text, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_system_event(text, text, text, jsonb, text) TO authenticated, service_role;

-- 2) Processo de LGPD: prazo, observações e evidência
ALTER TABLE public.privacy_requests
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS handler_notes text,
  ADD COLUMN IF NOT EXISTS evidence_url text;

UPDATE public.privacy_requests
   SET due_at = created_at + interval '15 days'
 WHERE due_at IS NULL;

ALTER TABLE public.privacy_requests
  ALTER COLUMN due_at SET DEFAULT (now() + interval '15 days');

CREATE OR REPLACE FUNCTION public.admin_resolve_privacy_request(
  _request_id uuid,
  _status text,
  _notes text DEFAULT NULL,
  _evidence_url text DEFAULT NULL
)
RETURNS public.privacy_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r public.privacy_requests;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem atender solicitações de privacidade';
  END IF;

  IF _status NOT IN ('open','in_progress','done','rejected') THEN
    RAISE EXCEPTION 'Situação inválida';
  END IF;

  UPDATE public.privacy_requests
     SET status = _status,
         handler_notes = coalesce(_notes, handler_notes),
         evidence_url = coalesce(_evidence_url, evidence_url),
         handled_by = auth.uid(),
         handled_at = CASE WHEN _status IN ('done','rejected') THEN now() ELSE handled_at END
   WHERE id = _request_id
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  INSERT INTO public.system_events (severity, source, message, context, user_id, category)
  VALUES ('info', 'lgpd', 'Solicitação de privacidade atualizada',
          jsonb_build_object('request_id', _request_id, 'status', _status),
          auth.uid(), 'lgpd');

  RETURN r;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_resolve_privacy_request(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_privacy_request(uuid, text, text, text) TO authenticated, service_role;

-- 3) Estados finais do pedido não voltam atrás, nem para administradores
CREATE OR REPLACE FUNCTION public.set_order_status(_order_id uuid, _status order_status)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF o.status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'Pedido % não pode mudar de situação', o.status;
  END IF;

  allowed := CASE o.status
    WHEN 'created' THEN ARRAY['awaiting_payment','cancelled']::order_status[]
    WHEN 'awaiting_payment' THEN ARRAY['paid','cancelled']::order_status[]
    WHEN 'paid' THEN ARRAY['in_delivery','cancelled']::order_status[]
    WHEN 'in_delivery' THEN ARRAY['completed','cancelled']::order_status[]
    ELSE ARRAY[]::order_status[]
  END;

  IF NOT (_status = ANY (allowed)) THEN
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
$function$;