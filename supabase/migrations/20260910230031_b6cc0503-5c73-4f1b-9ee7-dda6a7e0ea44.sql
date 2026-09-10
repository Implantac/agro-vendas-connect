CREATE OR REPLACE FUNCTION public.respond_proposal(_proposal_id uuid, _action text, _amount numeric DEFAULT NULL::numeric)
 RETURNS proposals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _p public.proposals;
  _prev public.proposal_status;
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

  IF _p.expires_at IS NOT NULL AND _p.expires_at < now() THEN
    RAISE EXCEPTION 'Esta proposta expirou';
  END IF;

  _prev := _p.status;

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
  VALUES (_proposal_id, _uid, _action, _prev, _new,
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
$function$;

REVOKE ALL ON FUNCTION public.respond_proposal(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_proposal(uuid, text, numeric) TO authenticated;