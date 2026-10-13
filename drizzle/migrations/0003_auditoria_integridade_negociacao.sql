CREATE OR REPLACE FUNCTION public.listings_block_delete_with_deals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.proposals WHERE listing_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.orders WHERE listing_id = OLD.id) THEN
    RAISE EXCEPTION 'Este anúncio tem propostas ou pedidos e não pode ser excluído. Pause ou arquive o anúncio para preservar o histórico.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_block_delete_with_deals ON public.listings;
CREATE TRIGGER trg_listings_block_delete_with_deals
  BEFORE DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listings_block_delete_with_deals();

DO $$
DECLARE
  _pair text;
  _tbl text;
  _col text;
  _idx text;
BEGIN
  FOREACH _pair IN ARRAY ARRAY[
    'member_documents.user_id', 'category_attributes.category_id',
    'listings.seller_id', 'listing_media.listing_id', 'favorites.listing_id',
    'favorites.user_id', 'proposals.listing_id', 'proposals.buyer_id',
    'proposals.seller_id', 'proposal_events.proposal_id', 'orders.listing_id',
    'orders.proposal_id', 'orders.buyer_id', 'orders.seller_id',
    'order_events.order_id', 'payments.order_id', 'conversations.listing_id',
    'conversations.proposal_id', 'conversations.buyer_id', 'conversations.seller_id',
    'messages.conversation_id', 'messages.sender_id', 'legal_acceptances.document_id',
    'legal_acceptances.user_id', 'reports.listing_id', 'reports.reporter_id',
    'membership_requests.plan_id', 'membership_requests.user_id',
    'system_events.user_id', 'machine_documents.owner_id', 'machine_events.owner_id',
    'contact_messages.user_id', 'notifications.user_id', 'saved_searches.user_id',
    'privacy_requests.user_id'
  ] LOOP
    _tbl := split_part(_pair, '.', 1);
    _col := split_part(_pair, '.', 2);
    CONTINUE WHEN to_regclass('public.' || _tbl) IS NULL;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = _tbl AND column_name = _col
    );
    CONTINUE WHEN EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = i.indkey[0]
      WHERE n.nspname = 'public' AND t.relname = _tbl AND a.attname = _col
    );
    _idx := _tbl || '_' || _col || '_idx';
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', _idx, _tbl, _col);
  END LOOP;
END
$$;

DO $$
DECLARE
  _spec text[];
  _tbl text;
  _col text;
  _cname text;
  _orphans bigint;
BEGIN
  FOREACH _spec SLICE 1 IN ARRAY ARRAY[
    ARRAY['orders', 'buyer_id'], ARRAY['orders', 'seller_id'],
    ARRAY['proposals', 'buyer_id'], ARRAY['proposals', 'seller_id'],
    ARRAY['conversations', 'buyer_id'], ARRAY['conversations', 'seller_id']
  ] LOOP
    _tbl := _spec[1];
    _col := _spec[2];
    _cname := _tbl || '_' || _col || '_profile_fkey';
    CONTINUE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = _cname);
    EXECUTE format(
      'SELECT count(*) FROM public.%I t WHERE t.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.%I)',
      _tbl, _col, _col
    ) INTO _orphans;
    IF _orphans > 0 THEN
      RAISE EXCEPTION 'Migration abortada: % linha(s) em %.% sem perfil correspondente.', _orphans, _tbl, _col;
    END IF;
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE RESTRICT',
      _tbl, _cname, _col
    );
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.create_proposal(
  _listing_id uuid,
  _amount numeric,
  _message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  _seller uuid;
  _msg text := NULLIF(btrim(COALESCE(_message, '')), '');
  _pid uuid;
  _cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para enviar proposta';
  END IF;
  IF _msg IS NOT NULL AND length(_msg) > 2000 THEN
    RAISE EXCEPTION 'A mensagem da proposta pode ter no máximo 2000 caracteres';
  END IF;

  SELECT l.seller_id INTO _seller FROM public.listings l WHERE l.id = _listing_id;
  IF _seller IS NULL THEN
    RAISE EXCEPTION 'Anúncio não encontrado ou indisponível';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.listing_id = _listing_id
      AND p.buyer_id = auth.uid()
      AND p.status IN ('open', 'countered')
  ) THEN
    RAISE EXCEPTION 'Você já tem uma negociação em andamento para este anúncio. Acompanhe-a no painel.';
  END IF;

  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, message, status)
  VALUES (_listing_id, auth.uid(), _seller, _amount, _msg, 'open')
  RETURNING id INTO _pid;

  INSERT INTO public.proposal_events (proposal_id, actor_id, event_type, new_status, message)
  VALUES (_pid, auth.uid(), 'created', 'open', _msg);

  INSERT INTO public.conversations (listing_id, proposal_id, buyer_id, seller_id)
  VALUES (_listing_id, _pid, auth.uid(), _seller)
  RETURNING id INTO _cid;

  IF _msg IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (_cid, auth.uid(), _msg);
  END IF;

  RETURN jsonb_build_object('proposal_id', _pid, 'conversation_id', _cid);
END;
$$;

REVOKE ALL ON FUNCTION public.create_proposal(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_proposal(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_proposal(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_publish_legal_document(
  _doc_type text,
  _title text,
  _version text,
  _content_md text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  _id uuid;
  _ver text := btrim(COALESCE(_version, ''));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem publicar termos';
  END IF;
  IF btrim(COALESCE(_title, '')) = '' OR _ver = '' OR btrim(COALESCE(_content_md, '')) = '' THEN
    RAISE EXCEPTION 'Preencha título, versão e conteúdo';
  END IF;
  IF EXISTS (SELECT 1 FROM public.legal_documents d WHERE d.doc_type = _doc_type AND d.version = _ver) THEN
    RAISE EXCEPTION 'Já existe a versão % deste documento', _ver;
  END IF;

  UPDATE public.legal_documents
     SET published = false
   WHERE doc_type = _doc_type AND published;

  INSERT INTO public.legal_documents (doc_type, title, version, content_md, published, published_at)
  VALUES (_doc_type, btrim(_title), _ver, _content_md, true, now())
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_publish_legal_document(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_publish_legal_document(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_publish_legal_document(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.orders_log_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _pct numeric;
BEGIN
  SELECT COALESCE((value->>'value')::numeric, 4) INTO _pct
    FROM public.app_settings WHERE key = 'commission_percent';
  INSERT INTO public.order_events (order_id, actor_id, event_type, metadata_json)
  VALUES (NEW.id, auth.uid(), 'order_created',
          jsonb_build_object('amount', NEW.amount, 'commission_percent', COALESCE(_pct, 4)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_log_created ON public.orders;
CREATE TRIGGER trg_orders_log_created
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_log_created();

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_listing_cover(_listing_id uuid, _media_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = _listing_id
      AND (l.seller_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Somente o vendedor do anúncio pode trocar a foto de capa';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.listing_media m
    WHERE m.id = _media_id AND m.listing_id = _listing_id
  ) THEN
    RAISE EXCEPTION 'Foto não pertence a este anúncio';
  END IF;

  UPDATE public.listing_media
     SET is_cover = (id = _media_id)
   WHERE listing_id = _listing_id
     AND is_cover IS DISTINCT FROM (id = _media_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_listing_cover(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_listing_cover(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_listing_cover(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.conversation_last_messages(_conversation_ids uuid[])
RETURNS TABLE (conversation_id uuid, content text, created_at timestamptz, sender_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (m.conversation_id)
         m.conversation_id, m.content, m.created_at, m.sender_id
    FROM public.messages m
   WHERE m.conversation_id = ANY (_conversation_ids)
   ORDER BY m.conversation_id, m.created_at DESC, m.id DESC;
$$;

REVOKE ALL ON FUNCTION public.conversation_last_messages(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.conversation_last_messages(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.conversation_last_messages(uuid[]) TO authenticated;
