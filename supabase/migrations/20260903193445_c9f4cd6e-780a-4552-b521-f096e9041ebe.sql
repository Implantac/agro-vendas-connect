-- 1. Notifications: restrict targets
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.shares_deal_with(user_id));

-- 2. Audit logs: actor must be the caller
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- 3. Proposals: no direct updates from the API; only respond_proposal (security definer)
DROP POLICY IF EXISTS proposals_parties_update ON public.proposals;
CREATE POLICY proposals_admin_update ON public.proposals
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Orders: parties may change only status / delivery notes
CREATE OR REPLACE FUNCTION public.orders_guard_financials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.seller_net_amount IS DISTINCT FROM OLD.seller_net_amount
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id THEN
    RAISE EXCEPTION 'Somente situação e observações do pedido podem ser alteradas';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_guard_financials ON public.orders;
CREATE TRIGGER trg_orders_guard_financials
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_financials();

-- 5. app_settings: authenticated only
DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- 6. respond_proposal: fix previous_status history bug + enforce expiry
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
    UPDATE public.proposals SET status = 'expired', updated_at = now() WHERE id = _proposal_id;
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

  RETURN _p;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.respond_proposal(uuid, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.respond_proposal(uuid, text, numeric) TO authenticated;