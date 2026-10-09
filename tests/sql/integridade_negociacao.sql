-- Testes da auditoria fase 2 (migration 20261010100000).
-- Cobre: exclusão de anúncio com negociação/pedido, RPC create_proposal (atômica),
-- RPC admin_publish_legal_document (troca de versão atômica), FKs e índices.
-- Roda com o papel real (anon, authenticated) e termina com ROLLBACK.
--
-- Uso: sudo -u postgres psql -d <banco> -f tests/sql/integridade_negociacao.sql

BEGIN;

CREATE TEMP TABLE resultados (
  ordem serial,
  teste text,
  status text,
  detalhe text
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.registra(_teste text, _ok boolean, _detalhe text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO resultados (teste, status, detalhe)
  VALUES (_teste, CASE WHEN _ok THEN 'PASS' ELSE 'FAIL' END, left(coalesce(_detalhe, ''), 160));
$$;

-- Fixtures (superusuário, sem RLS e sem triggers, só para montar o cenário)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'vendedor.int@example.invalid', '{"full_name":"Vendedor Int","requested_role":"seller"}'),
  ('b0000000-0000-4000-8000-000000000002', 'comprador.int@example.invalid', '{"full_name":"Comprador Int","requested_role":"buyer"}'),
  ('b0000000-0000-4000-8000-000000000003', 'comprador2.int@example.invalid', '{"full_name":"Comprador2 Int","requested_role":"buyer"}'),
  ('b0000000-0000-4000-8000-000000000004', 'admin.int@example.invalid', '{"full_name":"Admin Int","requested_role":"buyer"}');

SET session_replication_role = replica;
UPDATE public.profiles SET status = 'approved'
 WHERE id IN ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
              'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004');
INSERT INTO public.user_roles (user_id, role) VALUES ('b0000000-0000-4000-8000-000000000004', 'admin');

-- L1: anúncio com negociação (T01-T03, T06). L2: sem negociação (T07). L3: sem negociação, para teste de atomicidade (T05).
-- L4: anúncio com pedido (T08).
INSERT INTO public.listings (seller_id, category_id, title, slug, brand, model, manufacture_year, condition, price, city, state, status, published_at)
SELECT 'b0000000-0000-4000-8000-000000000001', c.id, 'Int L1', 'int-l1', 'Marca', 'M1', 2020, 'used', 1000, 'Cidade', 'UF', 'approved', now()
  FROM public.categories c LIMIT 1;
INSERT INTO public.listings (seller_id, category_id, title, slug, brand, model, manufacture_year, condition, price, city, state, status, published_at)
SELECT 'b0000000-0000-4000-8000-000000000001', c.id, 'Int L2', 'int-l2', 'Marca', 'M2', 2020, 'used', 1000, 'Cidade', 'UF', 'approved', now()
  FROM public.categories c LIMIT 1;
INSERT INTO public.listings (seller_id, category_id, title, slug, brand, model, manufacture_year, condition, price, city, state, status, published_at)
SELECT 'b0000000-0000-4000-8000-000000000001', c.id, 'Int L3', 'int-l3', 'Marca', 'M3', 2020, 'used', 1000, 'Cidade', 'UF', 'approved', now()
  FROM public.categories c LIMIT 1;
INSERT INTO public.listings (seller_id, category_id, title, slug, brand, model, manufacture_year, condition, price, city, state, status, published_at)
SELECT 'b0000000-0000-4000-8000-000000000001', c.id, 'Int L4', 'int-l4', 'Marca', 'M4', 2020, 'used', 1000, 'Cidade', 'UF', 'approved', now()
  FROM public.categories c LIMIT 1;
INSERT INTO public.listing_media (listing_id, media_type, url, is_cover, sort_order)
SELECT l.id, 'image', 'https://exemplo.invalid/foto-l2.jpg', true, 0 FROM public.listings l WHERE l.slug = 'int-l2';
RESET session_replication_role;

-- T01: comprador cria proposta pela RPC create_proposal (papel authenticated).
DO $$
DECLARE _res jsonb; _ok boolean := false; _m text := '';
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
    SELECT public.create_proposal(
      (SELECT id FROM public.listings WHERE slug = 'int-l1'), 900, 'Tem interesse no preço?') INTO _res;
    _ok := _res ? 'proposal_id' AND _res ? 'conversation_id';
    _m := coalesce(_res::text, 'nulo');
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T01 create_proposal cria proposta e devolve ids', _ok, _m);
END $$;

-- T02: a RPC gravou evento, conversa e mensagem (uma de cada), na mesma transação.
DO $$
DECLARE _p integer; _e integer; _c integer; _msg integer; _ok boolean;
BEGIN
  SELECT count(*) INTO _p FROM public.proposals p JOIN public.listings l ON l.id = p.listing_id
   WHERE l.slug = 'int-l1' AND p.buyer_id = 'b0000000-0000-4000-8000-000000000002';
  SELECT count(*) INTO _e FROM public.proposal_events pe JOIN public.proposals p ON p.id = pe.proposal_id
   JOIN public.listings l ON l.id = p.listing_id
   WHERE l.slug = 'int-l1' AND pe.event_type = 'created';
  SELECT count(*) INTO _c FROM public.conversations c JOIN public.listings l ON l.id = c.listing_id
   WHERE l.slug = 'int-l1' AND c.buyer_id = 'b0000000-0000-4000-8000-000000000002';
  SELECT count(*) INTO _msg FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
   JOIN public.listings l ON l.id = c.listing_id
   WHERE l.slug = 'int-l1' AND m.content = 'Tem interesse no preço?';
  _ok := _p = 1 AND _e = 1 AND _c = 1 AND _msg = 1;
  PERFORM pg_temp.registra('T02 proposta, evento, conversa e mensagem gravados juntos', _ok,
    'proposta=' || _p || ' evento=' || _e || ' conversa=' || _c || ' mensagem=' || _msg);
END $$;

-- T03: segunda proposta aberta do mesmo comprador no mesmo anúncio é recusada.
DO $$
DECLARE _ok boolean := false; _m text := 'criou';
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
    PERFORM public.create_proposal((SELECT id FROM public.listings WHERE slug = 'int-l1'), 800, NULL);
  EXCEPTION WHEN OTHERS THEN _ok := SQLERRM LIKE '%já tem uma negociação%'; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T03 segunda proposta aberta no mesmo anúncio é recusada', _ok, _m);
END $$;

-- T04: anônimo não executa create_proposal.
DO $$
DECLARE _ok boolean := false; _m text := 'executou';
BEGIN
  BEGIN
    SET ROLE anon;
    PERFORM public.create_proposal((SELECT id FROM public.listings WHERE slug = 'int-l3'), 500, NULL);
  EXCEPTION WHEN insufficient_privilege THEN _ok := true; _m := SQLERRM;
  WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T04 anônimo sem permissão para create_proposal', _ok, _m);
END $$;

-- T05: falha no meio da RPC não deixa proposta órfã (valor inválido, sem linhas residuais).
DO $$
DECLARE _ok boolean := false; _m text := 'criou'; _antes integer; _depois integer;
BEGIN
  SELECT count(*) INTO _antes FROM public.proposals p JOIN public.listings l ON l.id = p.listing_id
   WHERE l.slug = 'int-l3';
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000003', true);
    PERFORM public.create_proposal((SELECT id FROM public.listings WHERE slug = 'int-l3'), -10, 'valor inválido');
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT count(*) INTO _depois FROM public.proposals p JOIN public.listings l ON l.id = p.listing_id
   WHERE l.slug = 'int-l3';
  _ok := _m <> 'criou' AND _antes = _depois;
  PERFORM pg_temp.registra('T05 falha na RPC não deixa proposta órfã', _ok,
    'antes=' || _antes || ' depois=' || _depois || ' erro=' || _m);
END $$;

-- T06: vendedor não exclui anúncio que tem proposta; anúncio e proposta permanecem.
DO $$
DECLARE _ok boolean := false; _m text := 'excluiu'; _existe integer; _props integer;
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
    DELETE FROM public.listings WHERE slug = 'int-l1';
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT count(*) INTO _existe FROM public.listings WHERE slug = 'int-l1';
  SELECT count(*) INTO _props FROM public.proposals p JOIN public.listings l ON l.id = p.listing_id
   WHERE l.slug = 'int-l1';
  _ok := _m LIKE '%propostas ou pedidos%' AND _existe = 1 AND _props = 1;
  PERFORM pg_temp.registra('T06 anúncio com proposta não pode ser excluído', _ok,
    'anuncio=' || _existe || ' propostas=' || _props || ' erro=' || _m);
END $$;

-- T07: vendedor exclui anúncio sem negociação; as fotos saem pela cascata.
DO $$
DECLARE _ok boolean := false; _m text := 'não excluiu'; _fotos_antes integer; _fotos_depois integer; _existe integer;
BEGIN
  SELECT count(*) INTO _fotos_antes FROM public.listing_media lm JOIN public.listings l ON l.id = lm.listing_id
   WHERE l.slug = 'int-l2';
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
    DELETE FROM public.listings WHERE slug = 'int-l2';
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT count(*) INTO _existe FROM public.listings WHERE slug = 'int-l2';
  SELECT count(*) INTO _fotos_depois FROM public.listing_media lm WHERE lm.url = 'https://exemplo.invalid/foto-l2.jpg';
  _ok := _existe = 0 AND _fotos_antes = 1 AND _fotos_depois = 0;
  PERFORM pg_temp.registra('T07 anúncio sem negociação é excluído e fotos saem em cascata', _ok,
    'existe=' || _existe || ' fotos antes=' || _fotos_antes || ' depois=' || _fotos_depois || ' erro=' || _m);
END $$;

-- T08: anúncio com pedido não pode ser excluído, nem pelo administrador.
DO $$
DECLARE _ok boolean := false; _m text := 'excluiu'; _pid uuid; _existe integer;
BEGIN
  SET session_replication_role = replica;
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status)
  SELECT l.id, 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 1000, 'accepted'
    FROM public.listings l WHERE l.slug = 'int-l4' RETURNING id INTO _pid;
  INSERT INTO public.orders (listing_id, proposal_id, buyer_id, seller_id, amount, commission_amount, seller_net_amount)
  SELECT l.id, _pid, 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 1000, 40, 960
    FROM public.listings l WHERE l.slug = 'int-l4';
  RESET session_replication_role;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000004', true);
    DELETE FROM public.listings WHERE slug = 'int-l4';
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT count(*) INTO _existe FROM public.listings WHERE slug = 'int-l4';
  _ok := _m LIKE '%propostas ou pedidos%' AND _existe = 1;
  PERFORM pg_temp.registra('T08 anúncio com pedido não pode ser excluído, nem pelo admin', _ok,
    'existe=' || _existe || ' erro=' || _m);
END $$;

-- T09: admin publica nova versão; a anterior deixa de estar publicada; fica só uma vigente.
DO $$
DECLARE _ok boolean := false; _m text := ''; _novo uuid; _vigentes integer; _vigente uuid;
BEGIN
  SET session_replication_role = replica;
  INSERT INTO public.legal_documents (doc_type, title, version, content_md, published, published_at)
  VALUES ('terms', 'Termos teste int', 'INT-0', 'Conteúdo de teste da versão zero.', true, now() - interval '1 day');
  RESET session_replication_role;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000004', true);
    SELECT public.admin_publish_legal_document('terms', 'Termos teste int', 'INT-1', 'Conteúdo de teste da versão um.') INTO _novo;
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT count(*) INTO _vigentes FROM public.legal_documents WHERE doc_type = 'terms' AND published;
  SELECT id INTO _vigente FROM public.legal_documents WHERE doc_type = 'terms' AND published;
  _ok := _novo IS NOT NULL AND _vigentes = 1 AND _vigente = _novo;
  PERFORM pg_temp.registra('T09 admin publica versão e troca a vigente numa só operação', _ok,
    'vigentes=' || _vigentes || ' erro=' || _m);
END $$;

-- T10: versão repetida falha e a vigente atual continua publicada (sem estado parcial).
DO $$
DECLARE _ok boolean := false; _m text := 'publicou'; _antes uuid; _depois uuid; _vigentes integer;
BEGIN
  SELECT id INTO _antes FROM public.legal_documents WHERE doc_type = 'terms' AND published;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000004', true);
    PERFORM public.admin_publish_legal_document('terms', 'Termos teste int', 'INT-1', 'Tentativa repetida.');
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT id INTO _depois FROM public.legal_documents WHERE doc_type = 'terms' AND published;
  SELECT count(*) INTO _vigentes FROM public.legal_documents WHERE doc_type = 'terms' AND published;
  _ok := _m LIKE '%Já existe a versão%' AND _antes = _depois AND _vigentes = 1;
  PERFORM pg_temp.registra('T10 versão repetida falha e a vigente continua publicada', _ok,
    'vigentes=' || _vigentes || ' erro=' || _m);
END $$;

-- T11: comprador comum não publica termos.
DO $$
DECLARE _ok boolean := false; _m text := 'publicou';
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
    PERFORM public.admin_publish_legal_document('terms', 'Termos do comprador', 'INT-9', 'Conteúdo indevido.');
  EXCEPTION WHEN OTHERS THEN _ok := SQLERRM LIKE '%Apenas administradores%'; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T11 comprador não publica termos', _ok, _m);
END $$;

-- T12: as FKs de partes do negócio para profiles existem com ON DELETE RESTRICT.
DO $$
DECLARE _n integer;
BEGIN
  SELECT count(*) INTO _n FROM pg_constraint c
   WHERE c.contype = 'f' AND c.confdeltype = 'r'
     AND c.conname IN ('orders_buyer_id_profile_fkey', 'orders_seller_id_profile_fkey',
                       'proposals_buyer_id_profile_fkey', 'proposals_seller_id_profile_fkey',
                       'conversations_buyer_id_profile_fkey', 'conversations_seller_id_profile_fkey');
  PERFORM pg_temp.registra('T12 FKs de comprador/vendedor para profiles com RESTRICT', _n = 6, 'encontradas=' || _n);
END $$;

-- T13: toda FK do schema public tem índice cuja primeira coluna é a coluna da FK.
DO $$
DECLARE _sem integer;
BEGIN
  SELECT count(*) INTO _sem
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE c.contype = 'f' AND n.nspname = 'public'
     AND NOT EXISTS (
       SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]
     );
  PERFORM pg_temp.registra('T13 toda FK de public tem índice na coluna', _sem = 0, 'sem índice=' || _sem);
END $$;

-- T14: anônimo não executa a publicação de termos.
DO $$
DECLARE _ok boolean := false; _m text := 'executou';
BEGIN
  BEGIN
    SET ROLE anon;
    PERFORM public.admin_publish_legal_document('terms', 'x', 'INT-X', 'y');
  EXCEPTION WHEN insufficient_privilege THEN _ok := true; _m := SQLERRM;
  WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T14 anônimo sem permissão para publicar termos', _ok, _m);
END $$;

-- T15: pedido criado pelo comprador (papel authenticated) gera o evento order_created no banco.
DO $$
DECLARE _pid uuid; _oid uuid; _ev integer := 0; _ok boolean := false; _m text := '';
BEGIN
  SET session_replication_role = replica;
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status)
  SELECT l.id, 'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 700, 'accepted'
    FROM public.listings l WHERE l.slug = 'int-l3' RETURNING id INTO _pid;
  RESET session_replication_role;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000003', true);
    INSERT INTO public.orders (proposal_id, listing_id, buyer_id, seller_id, amount, commission_amount, seller_net_amount, status)
    SELECT _pid, l.id, 'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 700, 0, 0, 'created'
      FROM public.listings l WHERE l.slug = 'int-l3'
    RETURNING id INTO _oid;
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  IF _oid IS NOT NULL THEN
    SELECT count(*) INTO _ev FROM public.order_events WHERE order_id = _oid AND event_type = 'order_created';
    _ok := _ev = 1;
  END IF;
  PERFORM pg_temp.registra('T15 pedido gera evento order_created no banco', _ok,
    'eventos=' || _ev || ' erro=' || _m);
END $$;

-- T16: vendedor troca a capa; exatamente uma foto fica marcada como capa.
DO $$
DECLARE _l uuid; _m1 uuid; _m2 uuid; _caps integer; _cover uuid; _ok boolean := false; _m text := '';
BEGIN
  SELECT id INTO _l FROM public.listings WHERE slug = 'int-l3';
  SET session_replication_role = replica;
  INSERT INTO public.listing_media (listing_id, media_type, url, is_cover, sort_order)
  VALUES (_l, 'image', 'https://exemplo.invalid/l3-a.jpg', true, 0) RETURNING id INTO _m1;
  INSERT INTO public.listing_media (listing_id, media_type, url, is_cover, sort_order)
  VALUES (_l, 'image', 'https://exemplo.invalid/l3-b.jpg', false, 1) RETURNING id INTO _m2;
  RESET session_replication_role;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
    PERFORM public.set_listing_cover(_l, _m2);
    _ok := true;
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT count(*) FILTER (WHERE is_cover) INTO _caps FROM public.listing_media WHERE listing_id = _l;
  SELECT id INTO _cover FROM public.listing_media WHERE listing_id = _l AND is_cover;
  _ok := _ok AND _caps = 1 AND _cover = _m2;
  PERFORM pg_temp.registra('T16 vendedor troca capa e sobra uma única capa', _ok,
    'capas=' || _caps || ' erro=' || _m);
END $$;

-- T17: comprador não troca a capa de anúncio alheio (erro explícito, nada muda).
DO $$
DECLARE _l uuid; _m1 uuid; _ok boolean := false; _m text := 'trocou'; _cover_antes uuid; _cover_depois uuid;
BEGIN
  SELECT id INTO _l FROM public.listings WHERE slug = 'int-l3';
  SELECT id INTO _m1 FROM public.listing_media WHERE listing_id = _l ORDER BY sort_order LIMIT 1;
  SELECT id INTO _cover_antes FROM public.listing_media WHERE listing_id = _l AND is_cover;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
    PERFORM public.set_listing_cover(_l, _m1);
  EXCEPTION WHEN OTHERS THEN _ok := SQLERRM LIKE '%Somente o vendedor%'; _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT id INTO _cover_depois FROM public.listing_media WHERE listing_id = _l AND is_cover;
  _ok := _ok AND _cover_antes = _cover_depois;
  PERFORM pg_temp.registra('T17 comprador não troca capa de anúncio alheio', _ok, _m);
END $$;

-- T18: foto de outro anúncio não pode virar capa deste anúncio.
DO $$
DECLARE _l1 uuid; _l3 uuid; _foto_l3 uuid; _ok boolean := false; _m text := 'trocou';
BEGIN
  SELECT id INTO _l1 FROM public.listings WHERE slug = 'int-l1';
  SELECT id INTO _l3 FROM public.listings WHERE slug = 'int-l3';
  SELECT id INTO _foto_l3 FROM public.listing_media WHERE listing_id = _l3 ORDER BY sort_order LIMIT 1;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
    PERFORM public.set_listing_cover(_l1, _foto_l3);
  EXCEPTION WHEN OTHERS THEN _ok := SQLERRM LIKE '%não pertence%'; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T18 foto de outro anúncio não vira capa', _ok, _m);
END $$;

-- T19: última mensagem por conversa; só a parte da conversa vê.
-- Obs.: now() é o início da transação da suíte; a resposta usa horário posterior a ele.
DO $$
DECLARE _cid uuid; _ultimo text; _vista_parte integer := 0; _vista_terceiro integer := 0; _ok boolean := false;
BEGIN
  SELECT c.id INTO _cid FROM public.conversations c JOIN public.listings l ON l.id = c.listing_id WHERE l.slug = 'int-l1';
  SET session_replication_role = replica;
  INSERT INTO public.messages (conversation_id, sender_id, content, created_at) VALUES
    (_cid, 'b0000000-0000-4000-8000-000000000002', 'mensagem antiga', now() - interval '2 hours'),
    (_cid, 'b0000000-0000-4000-8000-000000000001', 'resposta mais recente', now() + interval '1 hour');
  RESET session_replication_role;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
    SELECT count(*) INTO _vista_parte FROM public.conversation_last_messages(ARRAY[_cid]);
    SELECT content INTO _ultimo FROM public.conversation_last_messages(ARRAY[_cid]);
    RESET ROLE;
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000003', true);
    SELECT count(*) INTO _vista_terceiro FROM public.conversation_last_messages(ARRAY[_cid]);
  EXCEPTION WHEN OTHERS THEN _ultimo := 'erro: ' || SQLERRM;
  END;
  RESET ROLE;
  _ok := _ultimo = 'resposta mais recente' AND _vista_parte = 1 AND _vista_terceiro = 0;
  PERFORM pg_temp.registra('T19 prévia traz a última mensagem e só para as partes', _ok,
    'ultimo=' || coalesce(_ultimo,'nulo') || ' parte=' || _vista_parte || ' terceiro=' || _vista_terceiro);
END $$;

-- T20: participante não troca o anúncio da conversa (guard conversations_guard_parties, já existente).
DO $$
DECLARE _cid uuid; _l3 uuid; _ok boolean := false; _m text := 'alterou';
BEGIN
  SELECT c.id INTO _cid FROM public.conversations c JOIN public.listings l ON l.id = c.listing_id WHERE l.slug = 'int-l1';
  SELECT id INTO _l3 FROM public.listings WHERE slug = 'int-l3';
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
    UPDATE public.conversations SET listing_id = _l3 WHERE id = _cid;
  EXCEPTION WHEN OTHERS THEN _ok := SQLERRM LIKE '%participantes da conversa não podem%'; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T20 participante não troca o anúncio da conversa', _ok, _m);
END $$;

-- T21: comprador marca a conversa como lida; só a linha dele é gravada.
DO $$
DECLARE _cid uuid; _comprador integer; _vendedor integer; _ok boolean := false; _m text := '';
BEGIN
  SELECT c.id INTO _cid FROM public.conversations c JOIN public.listings l ON l.id = c.listing_id WHERE l.slug = 'int-l1';
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
    PERFORM public.mark_conversation_read(_cid);
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  SELECT count(*) INTO _comprador FROM public.conversation_reads WHERE conversation_id = _cid AND user_id = 'b0000000-0000-4000-8000-000000000002';
  SELECT count(*) INTO _vendedor FROM public.conversation_reads WHERE conversation_id = _cid AND user_id = 'b0000000-0000-4000-8000-000000000001';
  _ok := _m = '' AND _comprador = 1 AND _vendedor = 0;
  PERFORM pg_temp.registra('T21 comprador marca como lida só a própria leitura', _ok,
    'comprador=' || _comprador || ' vendedor=' || _vendedor || ' erro=' || _m);
END $$;

-- T22: terceiro não marca conversa alheia como lida.
DO $$
DECLARE _cid uuid; _ok boolean := false; _m text := 'marcou';
BEGIN
  SELECT c.id INTO _cid FROM public.conversations c JOIN public.listings l ON l.id = c.listing_id WHERE l.slug = 'int-l1';
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000003', true);
    PERFORM public.mark_conversation_read(_cid);
  EXCEPTION WHEN OTHERS THEN _ok := SQLERRM LIKE '%Conversa não encontrada%'; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T22 terceiro não marca conversa alheia', _ok, _m);
END $$;

-- T23: anônimo não lê nem grava leituras.
DO $$
DECLARE _ok boolean := false; _m text := 'leu';
BEGIN
  BEGIN
    SET ROLE anon;
    PERFORM count(*) FROM public.conversation_reads;
  EXCEPTION WHEN insufficient_privilege THEN _ok := true; _m := SQLERRM;
  WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T23 anônimo sem acesso a conversation_reads', _ok, _m);
END $$;

-- Fixture das máquinas (T24-T26). Só para montar o cenário.
SET session_replication_role = replica;
INSERT INTO public.machines (id, owner_id, category_id, brand, model, verification_status)
SELECT 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', c.id, 'Marca', 'Máquina pública', 'unverified'
  FROM public.categories c LIMIT 1;
INSERT INTO public.machines (id, owner_id, category_id, brand, model, verification_status)
SELECT 'c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', c.id, 'Marca', 'Máquina oculta', 'unverified'
  FROM public.categories c LIMIT 1;
UPDATE public.listings SET machine_id = 'c0000000-0000-4000-8000-000000000001' WHERE slug = 'int-l1';
RESET session_replication_role;

-- T24: anônimo lê máquina de anúncio aprovado sem erro (regressão: a policy chamava is_admin(), e anon não tem EXECUTE).
DO $$
DECLARE _ok boolean := false; _m text := 'sem resultado'; _n integer;
BEGIN
  BEGIN
    SET ROLE anon;
    SELECT count(*) INTO _n FROM public.machines WHERE id = 'c0000000-0000-4000-8000-000000000001';
    _ok := _n = 1;
    _m := 'linhas visíveis: ' || _n;
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T24 anônimo lê máquina de anúncio aprovado sem erro', _ok, _m);
END $$;

-- T25: anônimo não vê máquina sem anúncio aprovado.
DO $$
DECLARE _ok boolean := false; _m text := 'sem resultado'; _n integer;
BEGIN
  BEGIN
    SET ROLE anon;
    SELECT count(*) INTO _n FROM public.machines WHERE id = 'c0000000-0000-4000-8000-000000000002';
    _ok := _n = 0;
    _m := 'linhas visíveis: ' || _n;
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T25 anônimo não vê máquina sem anúncio aprovado', _ok, _m);
END $$;

-- T26: admin (authenticated) continua vendo máquina sem anúncio aprovado.
DO $$
DECLARE _ok boolean := false; _m text := 'sem resultado'; _n integer;
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000004', true);
    SELECT count(*) INTO _n FROM public.machines WHERE id = 'c0000000-0000-4000-8000-000000000002';
    _ok := _n = 1;
    _m := 'linhas visíveis para admin: ' || _n;
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T26 admin lê máquina sem anúncio aprovado', _ok, _m);
END $$;

SELECT teste, status, detalhe FROM resultados ORDER BY ordem;
SELECT count(*) FILTER (WHERE status = 'PASS') AS aprovados, count(*) AS total FROM resultados;

ROLLBACK;
