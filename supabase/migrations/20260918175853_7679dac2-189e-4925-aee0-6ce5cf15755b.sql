-- 1. Eventos de webhook (idempotência)
CREATE TABLE public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  charge_reference text,
  amount numeric,
  payment_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_status text NOT NULL DEFAULT 'received',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

GRANT SELECT ON public.payment_webhook_events TO authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_webhook_events_admin_read ON public.payment_webhook_events
  FOR SELECT TO authenticated USING (public.is_admin());

-- 2. Rastreio do provedor na solicitação
ALTER TABLE public.membership_requests
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by text;

-- 3. Usuário não confirma mais o próprio pagamento
DROP FUNCTION IF EXISTS public.confirm_membership_payment(uuid, text);

-- 4. Confirmação pelo provedor (webhook), idempotente
CREATE OR REPLACE FUNCTION public.gateway_apply_payment(
  _provider text,
  _event_id text,
  _event_type text,
  _charge_reference text,
  _payment_status text,
  _amount numeric,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _r public.membership_requests; _result text;
BEGIN
  IF _provider IS NULL OR _event_id IS NULL THEN
    RAISE EXCEPTION 'Evento inválido';
  END IF;

  BEGIN
    INSERT INTO public.payment_webhook_events
      (provider, event_id, event_type, charge_reference, amount, payment_status, payload)
    VALUES (_provider, _event_id, COALESCE(_event_type,'unknown'), _charge_reference, _amount, _payment_status, COALESCE(_payload,'{}'::jsonb));
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status','duplicate');
  END;

  SELECT * INTO _r FROM public.membership_requests
   WHERE payment_reference = _charge_reference
   ORDER BY created_at DESC LIMIT 1;

  IF _r.id IS NULL THEN
    UPDATE public.payment_webhook_events
       SET processing_status='ignored', error_message='Cobrança não encontrada', processed_at=now()
     WHERE provider=_provider AND event_id=_event_id;
    RETURN jsonb_build_object('status','unmatched');
  END IF;

  IF _payment_status = 'paid' THEN
    IF _amount IS NULL OR _amount < _r.amount THEN
      UPDATE public.payment_webhook_events
         SET processing_status='rejected', error_message='Valor divergente', processed_at=now()
       WHERE provider=_provider AND event_id=_event_id;
      RETURN jsonb_build_object('status','amount_mismatch');
    END IF;
    IF _r.payment_status = 'paid' THEN
      _result := 'already_paid';
    ELSE
      UPDATE public.membership_requests
         SET payment_status='paid', paid_at=now(), payment_provider=_provider,
             payment_confirmed_by='gateway',
             status = CASE WHEN status='payment_pending' THEN 'in_review'::public.membership_request_status ELSE status END,
             updated_at=now()
       WHERE id=_r.id;
      _result := 'paid';
      INSERT INTO public.notifications (user_id, type, title, message, action_url)
      VALUES (_r.user_id,'membership','Pagamento confirmado','Sua solicitação entrou em análise.','/membresia');
    END IF;
  ELSIF _payment_status IN ('failed','cancelled') THEN
    UPDATE public.membership_requests
       SET payment_status='failed', paid_at=NULL, payment_provider=_provider, updated_at=now()
     WHERE id=_r.id AND status IN ('payment_pending','in_review');
    _result := 'failed';
  ELSIF _payment_status = 'refunded' THEN
    UPDATE public.membership_requests
       SET payment_status='refunded', payment_provider=_provider, updated_at=now()
     WHERE id=_r.id;
    _result := 'refunded';
  ELSE
    _result := 'ignored';
  END IF;

  UPDATE public.payment_webhook_events
     SET processing_status='processed', processed_at=now()
   WHERE provider=_provider AND event_id=_event_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (NULL,'membership_payment_' || _result,'membership_request',_r.id,
          jsonb_build_object('provider',_provider,'event_id',_event_id,'amount',_amount));

  RETURN jsonb_build_object('status',_result,'request_id',_r.id);
END;
$$;

REVOKE ALL ON FUNCTION public.gateway_apply_payment(text,text,text,text,text,numeric,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gateway_apply_payment(text,text,text,text,text,numeric,jsonb) TO service_role;

-- 5. Confirmação manual conferida pela administração
CREATE OR REPLACE FUNCTION public.admin_confirm_membership_payment(
  _request_id uuid,
  _method text,
  _reference text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _r public.membership_requests;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar pagamento';
  END IF;
  SELECT * INTO _r FROM public.membership_requests WHERE id=_request_id FOR UPDATE;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF _r.payment_status = 'paid' THEN RETURN; END IF;

  UPDATE public.membership_requests
     SET payment_status='paid', paid_at=now(),
         payment_method=COALESCE(_method,payment_method),
         payment_reference=COALESCE(_reference,payment_reference),
         payment_confirmed_by='admin',
         status = CASE WHEN status='payment_pending' THEN 'in_review'::public.membership_request_status ELSE status END,
         updated_at=now()
   WHERE id=_request_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (auth.uid(),'membership_payment_confirmed_manual','membership_request',_request_id,
          jsonb_build_object('method',_method,'reference',_reference));

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (_r.user_id,'membership','Pagamento confirmado','Sua solicitação entrou em análise.','/membresia');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_confirm_membership_payment(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_membership_payment(uuid,text,text) TO authenticated, service_role;