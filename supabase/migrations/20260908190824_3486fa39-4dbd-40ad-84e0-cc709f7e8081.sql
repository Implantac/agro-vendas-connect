DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_write_audit_log(
  _action text,
  _entity_type text,
  _entity_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar auditoria';
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_write_audit_log(text, text, uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_write_audit_log(text, text, uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
REVOKE INSERT ON public.notifications FROM authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_new_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _title text;
BEGIN
  SELECT title INTO _title FROM public.listings WHERE id = NEW.listing_id;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    NEW.seller_id,
    'proposal_received',
    'Nova proposta recebida',
    'Você recebeu uma proposta para ' || COALESCE(_title, 'seu anúncio') || '.',
    '/app/negociacao/' || NEW.id
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_notify_new_proposal() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_new_proposal ON public.proposals;
CREATE TRIGGER trg_notify_new_proposal
AFTER INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_proposal();

CREATE OR REPLACE FUNCTION public.trg_notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _c public.conversations; _recipient uuid;
BEGIN
  SELECT * INTO _c FROM public.conversations WHERE id = NEW.conversation_id;
  IF _c.id IS NULL THEN RETURN NEW; END IF;
  _recipient := CASE WHEN NEW.sender_id = _c.buyer_id THEN _c.seller_id ELSE _c.buyer_id END;
  IF _recipient IS NULL OR _recipient = NEW.sender_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    _recipient,
    'new_message',
    'Nova mensagem',
    'Você recebeu uma nova mensagem em uma negociação.',
    '/app/negociacao/' || _c.proposal_id
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_notify_new_message() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_message();

CREATE OR REPLACE FUNCTION public.respond_proposal(_proposal_id uuid, _action text, _amount numeric DEFAULT NULL)
RETURNS public.proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.proposals;
  _new public.proposal_status;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;

  SELECT * INTO _p FROM public.proposals WHERE id = _proposal_id FOR UPDATE;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Proposta não encontrada'; END IF;

  IF _uid <> _p.buyer_id AND _uid <> _p.seller_id THEN
    RAISE EXCEPTION 'Você não participa desta negociação';
  END IF;

  IF _p.status NOT IN ('open','countered') THEN
    RAISE EXCEPTION 'Esta negociação já está encerrada';
  END IF;

  IF _action = 'accepted' THEN _new := 'accepted';
  ELSIF _action = 'rejected' THEN _new := 'rejected';
  ELSIF _action = 'cancelled' THEN
    IF _uid <> _p.buyer_id THEN RAISE EXCEPTION 'Somente o comprador pode cancelar a proposta'; END IF;
    _new := 'cancelled';
  ELSIF _action = 'countered' THEN
    IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Informe um valor válido para a contraproposta'; END IF;
    _new := 'countered';
  ELSE
    RAISE EXCEPTION 'Ação inválida';
  END IF;

  UPDATE public.proposals
     SET status = _new,
         amount = CASE WHEN _new = 'countered' THEN _amount ELSE amount END,
         updated_at = now()
   WHERE id = _proposal_id
  RETURNING * INTO _p;

  INSERT INTO public.proposal_events (proposal_id, actor_id, event_type, previous_status, new_status, message)
  VALUES (_proposal_id, _uid, _action, _p.status, _new,
          CASE WHEN _new = 'countered' THEN 'Contraproposta de R$ ' || _amount::text ELSE NULL END);

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (_uid, 'proposal_' || _action, 'proposal', _proposal_id,
          jsonb_build_object('amount', _p.amount, 'status', _new));

  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    CASE WHEN _uid = _p.buyer_id THEN _p.seller_id ELSE _p.buyer_id END,
    'proposal_' || _action,
    CASE _new
      WHEN 'accepted' THEN 'Proposta aceita'
      WHEN 'rejected' THEN 'Proposta recusada'
      WHEN 'cancelled' THEN 'Proposta cancelada'
      ELSE 'Nova contraproposta'
    END,
    CASE WHEN _new = 'countered'
      THEN 'Nova contraproposta de R$ ' || _amount::text
      ELSE 'Sua negociação foi atualizada.'
    END,
    '/app/negociacao/' || _proposal_id
  );

  RETURN _p;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.respond_proposal(uuid, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.respond_proposal(uuid, text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_proposal_terms(_proposal_id uuid, _terms jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.proposals;
BEGIN
  SELECT * INTO _p FROM public.proposals WHERE id = _proposal_id FOR UPDATE;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'Proposta não encontrada'; END IF;
  IF auth.uid() <> _p.buyer_id AND auth.uid() <> _p.seller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Você não participa desta negociação';
  END IF;
  IF _p.status NOT IN ('open','countered','accepted') THEN
    RAISE EXCEPTION 'Esta negociação está encerrada';
  END IF;
  UPDATE public.proposals SET terms_json = COALESCE(_terms,'{}'::jsonb), updated_at = now() WHERE id = _proposal_id;
  INSERT INTO public.proposal_events (proposal_id, actor_id, event_type, previous_status, new_status, message)
  VALUES (_proposal_id, auth.uid(), 'terms_updated', _p.status, _p.status, 'Condições comerciais atualizadas');
  IF NOT public.is_admin() THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (
      CASE WHEN auth.uid() = _p.buyer_id THEN _p.seller_id ELSE _p.buyer_id END,
      'proposal_terms',
      'Condições comerciais atualizadas',
      'A outra parte registrou condições de pagamento, prazo ou entrega.',
      '/app/negociacao/' || _proposal_id
    );
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.update_proposal_terms(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_proposal_terms(uuid, jsonb) TO authenticated;