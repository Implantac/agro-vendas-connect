-- ===== P0: guardas de segurança no banco =====

-- 1. profiles: usuário não altera role/status/rejection_reason
CREATE OR REPLACE FUNCTION public.profiles_guard_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Papel e status do membro só podem ser alterados pela administração';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_profiles_guard_privileges ON public.profiles;
CREATE TRIGGER trg_profiles_guard_privileges BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileges();

-- 2. listings: vendedor não troca dono, não se auto-aprova, não mexe em views
CREATE OR REPLACE FUNCTION public.listings_guard_seller()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    RAISE EXCEPTION 'O responsável pelo anúncio não pode ser alterado';
  END IF;
  IF NEW.views_count IS DISTINCT FROM OLD.views_count THEN
    NEW.views_count := OLD.views_count;
  END IF;
  IF NEW.moderation_notes IS DISTINCT FROM OLD.moderation_notes THEN
    NEW.moderation_notes := OLD.moderation_notes;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'rejected' THEN
      RAISE EXCEPTION 'Somente a moderação pode rejeitar um anúncio';
    END IF;
    IF NEW.status = 'approved' AND OLD.status <> 'paused' THEN
      RAISE EXCEPTION 'Anúncios precisam passar pela moderação antes de serem publicados';
    END IF;
    IF NEW.status = 'approved' AND OLD.status = 'paused' THEN
      NEW.published_at := COALESCE(OLD.published_at, now());
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_listings_guard_seller ON public.listings;
CREATE TRIGGER trg_listings_guard_seller BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.listings_guard_seller();

-- 3. seller_profiles: só admin muda verification_status / dono
CREATE OR REPLACE FUNCTION public.seller_profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'O responsável pela empresa não pode ser alterado';
    END IF;
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      -- Alterações relevantes reabrem a verificação; nunca auto-aprovação.
      NEW.verification_status := CASE WHEN NEW.verification_status = 'approved' THEN OLD.verification_status ELSE NEW.verification_status END;
    END IF;
  ELSIF NEW.verification_status <> 'pending' THEN
    NEW.verification_status := 'pending';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_seller_profiles_guard ON public.seller_profiles;
CREATE TRIGGER trg_seller_profiles_guard BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION public.seller_profiles_guard();

-- 4. conversations: participantes imutáveis
CREATE OR REPLACE FUNCTION public.conversations_guard_parties()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.listing_id IS DISTINCT FROM OLD.listing_id OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id THEN
    RAISE EXCEPTION 'Os participantes da conversa não podem ser alterados';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_conversations_guard_parties ON public.conversations;
CREATE TRIGGER trg_conversations_guard_parties BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.conversations_guard_parties();

-- 5. proposals: validação na criação + condições comerciais estruturadas
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS terms_json jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.proposals_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _seller uuid; _status public.listing_status;
BEGIN
  SELECT seller_id, status INTO _seller, _status FROM public.listings WHERE id = NEW.listing_id;
  IF _seller IS NULL THEN RAISE EXCEPTION 'Anúncio não encontrado'; END IF;
  IF _status <> 'approved' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Só é possível enviar proposta para anúncios publicados';
  END IF;
  IF NEW.seller_id IS DISTINCT FROM _seller THEN NEW.seller_id := _seller; END IF;
  IF NEW.buyer_id = NEW.seller_id THEN
    RAISE EXCEPTION 'Você não pode enviar proposta para o próprio anúncio';
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Informe um valor válido para a proposta';
  END IF;
  NEW.status := 'open';
  NEW.expires_at := COALESCE(NEW.expires_at, now() + interval '48 hours');
  IF NEW.expires_at > now() + interval '48 hours' THEN NEW.expires_at := now() + interval '48 hours'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_proposals_guard_insert ON public.proposals;
CREATE TRIGGER trg_proposals_guard_insert BEFORE INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.proposals_guard_insert();

-- Condições comerciais: só participantes, só enquanto aberta; demais campos via RPC
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
END; $$;
REVOKE ALL ON FUNCTION public.update_proposal_terms(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_proposal_terms(uuid, jsonb) TO authenticated;

-- 6. orders: criação só a partir de proposta aceita, valores calculados pelo banco
CREATE OR REPLACE FUNCTION public.orders_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.proposals; _pct numeric;
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.proposal_id IS NULL THEN RAISE EXCEPTION 'Pedidos são gerados a partir de uma proposta aceita'; END IF;
  SELECT * INTO _p FROM public.proposals WHERE id = NEW.proposal_id;
  IF _p.id IS NULL OR _p.status <> 'accepted' THEN
    RAISE EXCEPTION 'A proposta precisa estar aceita para gerar o pedido';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE proposal_id = NEW.proposal_id) THEN
    RAISE EXCEPTION 'Esta proposta já possui pedido';
  END IF;
  SELECT COALESCE((value->>'value')::numeric, 4) INTO _pct FROM public.app_settings WHERE key = 'commission_percent';
  _pct := COALESCE(_pct, 4);
  NEW.buyer_id := _p.buyer_id;
  NEW.seller_id := _p.seller_id;
  NEW.listing_id := _p.listing_id;
  NEW.amount := _p.amount;
  NEW.commission_amount := round(_p.amount * _pct / 100, 2);
  NEW.seller_net_amount := _p.amount - NEW.commission_amount;
  NEW.status := 'created';
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_orders_guard_insert ON public.orders;
CREATE TRIGGER trg_orders_guard_insert BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_guard_insert();

-- ===== Preparação de dados (funil, listas, histórico) =====
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS list_name text;

CREATE TABLE IF NOT EXISTS public.listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL, -- view | favorite | contact | proposal
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_events_listing ON public.listing_events(listing_id, event_type);
GRANT SELECT ON public.listing_events TO authenticated;
GRANT ALL ON public.listing_events TO service_role;
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_events_seller_read ON public.listing_events FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_events.listing_id AND l.seller_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.listing_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  old_price numeric,
  new_price numeric,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_price_history_listing ON public.listing_price_history(listing_id, changed_at DESC);
GRANT SELECT ON public.listing_price_history TO authenticated;
GRANT ALL ON public.listing_price_history TO service_role;
ALTER TABLE public.listing_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_price_history_read ON public.listing_price_history FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.listings_track_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.listing_price_history (listing_id, old_price, new_price) VALUES (NEW.id, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_listings_track_price ON public.listings;
CREATE TRIGGER trg_listings_track_price AFTER UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.listings_track_price();

-- Eventos automáticos: favorito, proposta, contato
CREATE OR REPLACE FUNCTION public.log_listing_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'favorites' THEN
    INSERT INTO public.listing_events (listing_id, actor_id, event_type) VALUES (NEW.listing_id, NEW.user_id, 'favorite');
  ELSIF TG_TABLE_NAME = 'proposals' THEN
    INSERT INTO public.listing_events (listing_id, actor_id, event_type, metadata_json) VALUES (NEW.listing_id, NEW.buyer_id, 'proposal', jsonb_build_object('amount', NEW.amount));
  ELSIF TG_TABLE_NAME = 'conversations' AND NEW.listing_id IS NOT NULL THEN
    INSERT INTO public.listing_events (listing_id, actor_id, event_type) VALUES (NEW.listing_id, NEW.buyer_id, 'contact');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_favorites_event ON public.favorites;
CREATE TRIGGER trg_favorites_event AFTER INSERT ON public.favorites FOR EACH ROW EXECUTE FUNCTION public.log_listing_event();
DROP TRIGGER IF EXISTS trg_proposals_event ON public.proposals;
CREATE TRIGGER trg_proposals_event AFTER INSERT ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.log_listing_event();
DROP TRIGGER IF EXISTS trg_conversations_event ON public.conversations;
CREATE TRIGGER trg_conversations_event AFTER INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.log_listing_event();

-- Visualização (idempotente por usuário/dia; não conta o próprio vendedor)
CREATE OR REPLACE FUNCTION public.register_listing_view(_listing_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _seller uuid;
BEGIN
  SELECT seller_id INTO _seller FROM public.listings WHERE id = _listing_id AND status = 'approved';
  IF _seller IS NULL OR _seller = auth.uid() THEN RETURN; END IF;
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.listing_events
     WHERE listing_id = _listing_id AND actor_id = auth.uid() AND event_type = 'view' AND created_at > now() - interval '1 day') THEN
    RETURN;
  END IF;
  INSERT INTO public.listing_events (listing_id, actor_id, event_type) VALUES (_listing_id, auth.uid(), 'view');
  UPDATE public.listings SET views_count = views_count + 1 WHERE id = _listing_id;
END; $$;
REVOKE ALL ON FUNCTION public.register_listing_view(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_listing_view(uuid) TO authenticated;

-- Funções internas de trigger não podem ser chamadas diretamente
REVOKE ALL ON FUNCTION public.profiles_guard_privileges() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.listings_guard_seller() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.seller_profiles_guard() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.conversations_guard_parties() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.proposals_guard_insert() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_guard_insert() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.listings_track_price() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_listing_event() FROM public, anon, authenticated;