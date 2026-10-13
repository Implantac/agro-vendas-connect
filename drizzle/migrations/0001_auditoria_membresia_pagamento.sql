-- Auditoria de 09/10/2026 — membresia e pagamento.
-- Achados: C-01 (solicitação forjada paga/aprovada), C-02 (valor controlado pelo cliente),
-- C-03 (aprovação sem pagamento), C-04 (estorno sem revogar acesso), M-06 (cobrança duplicada),
-- M-07 (referência duplicável), pagamento tardio após recusa/cancelamento.
-- Validado na réplica com tests/sql/ataques_adicionais.sql e tests/sql/ciclo_pagamento.sql.

-- Marca de início da geração da cobrança (trava para evitar cobranças duplicadas, M-06).
ALTER TABLE public.membership_requests
  ADD COLUMN IF NOT EXISTS checkout_started_at timestamptz;

-- C-01 / C-02: a solicitação só nasce no estado inicial e com o valor do plano ativo.
DROP POLICY IF EXISTS "Membro cria sua solicitacao" ON public.membership_requests;
CREATE POLICY "Membro cria sua solicitacao" ON public.membership_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'payment_pending'
    AND payment_status = 'pending'
    AND paid_at IS NULL
    AND payment_confirmed_by IS NULL
    AND payment_provider IS NULL
    AND gateway_payment_id IS NULL
    AND checkout_url IS NULL
    AND checkout_started_at IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND plan_id IS NOT NULL
    AND amount = (SELECT p.price FROM public.membership_plans p WHERE p.id = plan_id AND p.active)
  );

-- M-07: a referência de cobrança identifica uma única solicitação.
CREATE UNIQUE INDEX IF NOT EXISTS membership_requests_payment_reference_uq
  ON public.membership_requests (payment_reference)
  WHERE payment_reference IS NOT NULL;

-- C-03: aprovação exige pagamento confirmado no banco, não só na tela.
CREATE OR REPLACE FUNCTION public.admin_review_membership(_request_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid; _role public.member_role; _pay public.membership_payment_status;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem analisar solicitações'; END IF;

  SELECT user_id, requested_role, payment_status INTO _user, _role, _pay
    FROM public.membership_requests WHERE id = _request_id FOR UPDATE;
  IF _user IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF _approve AND _pay <> 'paid' THEN
    RAISE EXCEPTION 'A membresia só pode ser aprovada com pagamento confirmado';
  END IF;

  UPDATE public.membership_requests
     SET status = CASE WHEN _approve THEN 'approved'::public.membership_request_status
                       ELSE 'rejected'::public.membership_request_status END,
         review_notes = _notes, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
   WHERE id = _request_id;

  IF _approve THEN
    UPDATE public.profiles SET status = 'approved', role = _role, rejection_reason = NULL, updated_at = now()
     WHERE id = _user;
  ELSE
    UPDATE public.profiles SET status = 'rejected', rejection_reason = _notes, updated_at = now()
     WHERE id = _user;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (_user, 'membership',
          CASE WHEN _approve THEN 'Membresia aprovada' ELSE 'Membresia recusada' END,
          COALESCE(_notes, CASE WHEN _approve THEN 'Seu acesso ao DDP AGRO foi liberado.' ELSE 'Sua solicitação foi recusada.' END),
          CASE WHEN _approve THEN '/app' ELSE '/cadastro-rejeitado' END);

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'membership_approved' ELSE 'membership_rejected' END,
          'membership_request', _request_id, jsonb_build_object('notes', _notes, 'role', _role));
END;
$$;

-- C-04 e M-07: webhook do gateway.
--  - estorno/chargeback suspende o acesso do membro aprovado e avisa o membro;
--  - pagamento que chega depois de recusa/cancelamento reabre a análise (não é ignorado);
--  - valor menor que o da solicitação nunca confirma;
--  - idempotência por (provider, event_id) mantida.
CREATE OR REPLACE FUNCTION public.gateway_apply_payment(
  _provider text, _event_id text, _event_type text, _charge_reference text,
  _payment_status text, _amount numeric, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _r public.membership_requests; _result text;
BEGIN
  IF _provider IS NULL OR _event_id IS NULL THEN RAISE EXCEPTION 'Evento inválido'; END IF;

  BEGIN
    INSERT INTO public.payment_webhook_events
      (provider, event_id, event_type, charge_reference, amount, payment_status, payload)
    VALUES (_provider, _event_id, COALESCE(_event_type,'unknown'), _charge_reference, _amount, _payment_status, COALESCE(_payload,'{}'::jsonb));
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status','duplicate');
  END;

  SELECT * INTO _r FROM public.membership_requests
   WHERE payment_reference = _charge_reference
   LIMIT 1;

  IF _r.id IS NULL THEN
    UPDATE public.payment_webhook_events SET processing_status='ignored', error_message='Cobrança não encontrada', processed_at=now()
     WHERE provider=_provider AND event_id=_event_id;
    RETURN jsonb_build_object('status','unmatched');
  END IF;

  IF _payment_status = 'paid' THEN
    IF _amount IS NULL OR _amount < _r.amount THEN
      UPDATE public.payment_webhook_events SET processing_status='rejected', error_message='Valor divergente', processed_at=now()
       WHERE provider=_provider AND event_id=_event_id;
      RETURN jsonb_build_object('status','amount_mismatch');
    END IF;
    IF _r.payment_status = 'paid' THEN
      _result := 'already_paid';
    ELSIF _r.status IN ('rejected','cancelled') THEN
      -- Dinheiro recebido depois do encerramento: a análise é reaberta para o administrador decidir.
      UPDATE public.membership_requests
         SET payment_status='paid', paid_at=now(), payment_provider=_provider, payment_confirmed_by='gateway',
             status='in_review', updated_at=now()
       WHERE id=_r.id;
      _result := 'paid_reopened';
      INSERT INTO public.notifications (user_id, type, title, message, action_url)
      VALUES (_r.user_id,'membership','Pagamento recebido','Recebemos seu pagamento após o encerramento da solicitação. Ela foi reaberta para análise.','/membresia');
    ELSE
      UPDATE public.membership_requests
         SET payment_status='paid', paid_at=now(), payment_provider=_provider, payment_confirmed_by='gateway',
             status = CASE WHEN status='payment_pending' THEN 'in_review'::public.membership_request_status ELSE status END,
             updated_at=now()
       WHERE id=_r.id;
      _result := 'paid';
      INSERT INTO public.notifications (user_id, type, title, message, action_url)
      VALUES (_r.user_id,'membership','Pagamento confirmado','Sua solicitação entrou em análise.','/membresia');
    END IF;
  ELSIF _payment_status IN ('failed','cancelled') THEN
    UPDATE public.membership_requests SET payment_status='failed', paid_at=NULL, payment_provider=_provider, updated_at=now()
     WHERE id=_r.id AND status IN ('payment_pending','in_review');
    _result := 'failed';
  ELSIF _payment_status = 'refunded' THEN
    UPDATE public.membership_requests SET payment_status='refunded', payment_provider=_provider, updated_at=now()
     WHERE id=_r.id;
    -- Estorno retira o acesso até nova análise (que exigirá novo pagamento confirmado).
    UPDATE public.profiles SET status='suspended', updated_at=now()
     WHERE id=_r.user_id AND status='approved';
    IF FOUND THEN
      INSERT INTO public.notifications (user_id, type, title, message, action_url)
      VALUES (_r.user_id,'membership','Acesso suspenso','Houve estorno do pagamento da sua membresia e o acesso foi suspenso. Fale com a equipe.','/contato');
    END IF;
    _result := 'refunded';
  ELSE
    _result := 'ignored';
  END IF;

  UPDATE public.payment_webhook_events SET processing_status='processed', processed_at=now()
   WHERE provider=_provider AND event_id=_event_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (NULL,'membership_payment_' || _result,'membership_request',_r.id,
          jsonb_build_object('provider',_provider,'event_id',_event_id,'amount',_amount));

  RETURN jsonb_build_object('status',_result,'request_id',_r.id);
END;
$$;

REVOKE ALL ON FUNCTION public.gateway_apply_payment(text,text,text,text,text,numeric,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gateway_apply_payment(text,text,text,text,text,numeric,jsonb) TO service_role;
