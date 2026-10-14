-- Regressão das correções da auditoria de 09/10/2026.
-- Roda numa réplica com as migrations do repositório aplicadas. Termina com ROLLBACK:
-- nada é gravado. Cada teste usa o papel real (anon, authenticated, service_role).
--
-- Uso: sudo -u postgres psql -d <banco> -f tests/sql/regressao_auditoria.sql

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

-- Fixtures (como superusuário, que ignora RLS para montar o cenário)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'vendedor.reg@example.invalid', '{"full_name":"Vendedor Reg","requested_role":"seller"}'),
  ('a0000000-0000-4000-8000-000000000002', 'comprador.reg@example.invalid', '{"full_name":"Comprador Reg","requested_role":"buyer"}');

-- Fixture: aprova o vendedor sem passar pelos guards (só na montagem do cenário).
SET session_replication_role = replica;
UPDATE public.profiles SET status = 'approved'
 WHERE id = 'a0000000-0000-4000-8000-000000000001';
SET session_replication_role = origin;

-- T01: TRUNCATE não pode ser executado por authenticated (RLS não protege TRUNCATE).
DO $$
DECLARE _ok boolean := false; _m text := 'executou';
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
    TRUNCATE public.app_settings;
  EXCEPTION WHEN insufficient_privilege THEN _ok := true; _m := SQLERRM;
  WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T01 TRUNCATE negado a authenticated', _ok, _m);
END $$;

-- T02: service role (servidor) continua podendo mudar status de perfil.
DO $$
DECLARE _ok boolean := false; _n integer := 0; _m text := '';
BEGIN
  BEGIN
    SET ROLE service_role;
    UPDATE public.profiles SET status = 'suspended' WHERE id = 'a0000000-0000-4000-8000-000000000001';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _ok := _n = 1;
    _m := 'linhas: ' || _n;
    UPDATE public.profiles SET status = 'approved' WHERE id = 'a0000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN OTHERS THEN _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T02 service_role altera status de perfil', _ok, _m);
END $$;

-- T03: membro não aprova a si mesmo (guard continua valendo para authenticated).
DO $$
DECLARE _ok boolean := false; _m text := 'executou';
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
    UPDATE public.profiles SET status = 'approved' WHERE id = 'a0000000-0000-4000-8000-000000000002';
  EXCEPTION WHEN OTHERS THEN _ok := SQLERRM LIKE '%Apenas administradores%'; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T03 membro não altera o próprio status', _ok, _m);
END $$;

-- T04 a T07 (dados de demonstração sem anúncios/vendedores/máquinas e cobrança online desligada)
-- foram removidos desta suíte em 14/10/2026. Motivo: eles checavam o efeito da migration
-- 20261009100300, que foi retirada do repositório por decisão de produto (apagaria os anúncios
-- de exemplo e desligaria o Asaas). Estado de dados e de cobrança é decisão operacional, não
-- invariante de código. Se a decisão mudar, reintroduzir os testes junto com a migration.

-- T08: cadastro com legal_accept grava o aceite no próprio trigger (sem sessão imediata).
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'aceite.reg@example.invalid',
   '{"full_name":"Aceite Reg","requested_role":"buyer","legal_accept":"true","legal_user_agent":"teste"}');
DO $$
DECLARE _n integer; _esperado integer;
BEGIN
  SELECT count(*) INTO _n FROM public.legal_acceptances WHERE user_id = 'a0000000-0000-4000-8000-000000000003';
  SELECT count(*) INTO _esperado FROM public.legal_documents
   WHERE published AND doc_type IN ('terms', 'privacy', 'liability');
  PERFORM pg_temp.registra('T08 aceite legal gravado no cadastro', _n = _esperado AND _n > 0,
    'aceites: ' || _n || ' de ' || _esperado);
END $$;

-- T09: cadastro sem legal_accept não grava aceite.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-4000-8000-000000000004', 'semaceite.reg@example.invalid', '{"full_name":"Sem Aceite"}');
DO $$
DECLARE _n integer;
BEGIN
  SELECT count(*) INTO _n FROM public.legal_acceptances WHERE user_id = 'a0000000-0000-4000-8000-000000000004';
  PERFORM pg_temp.registra('T09 sem legal_accept não grava aceite', _n = 0, 'aceites: ' || _n);
END $$;

-- T10: contato anônimo tem limite de 5 mensagens por e-mail em 24 h.
DO $$
DECLARE _ok integer := 0; _bloqueou boolean := false; _m text := '';
BEGIN
  FOR i IN 1..6 LOOP
    BEGIN
      SET ROLE anon;
      INSERT INTO public.contact_messages (email, details)
      VALUES ('limite.reg@example.invalid', 'Mensagem de teste número ' || i);
      _ok := _ok + 1;
    EXCEPTION WHEN OTHERS THEN
      _bloqueou := SQLERRM LIKE '%Muitas solicitações%';
      _m := SQLERRM;
    END;
    RESET ROLE;
  END LOOP;
  PERFORM pg_temp.registra('T10 limite de 5 contatos por e-mail', _ok = 5 AND _bloqueou,
    'aceitos: ' || _ok || ' | ' || _m);
END $$;

-- T11: anônimo não lê a caixa de contato.
DO $$
DECLARE _n integer;
BEGIN
  SET ROLE anon;
  SELECT count(*) INTO _n FROM public.contact_messages;
  RESET ROLE;
  PERFORM pg_temp.registra('T11 anônimo não lê contact_messages', _n = 0, 'visíveis: ' || _n);
END $$;

-- T12: solicitação de membresia não nasce com marcas de pagamento/checkout (atacante).
DO $$
DECLARE _ok boolean := false; _m text := 'inseriu';
DECLARE _plan uuid; _price numeric;
BEGIN
  SELECT id, price INTO _plan, _price FROM public.membership_plans WHERE active ORDER BY sort_order LIMIT 1;
  BEGIN
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
    INSERT INTO public.membership_requests
      (user_id, plan_id, requested_role, amount, payment_method, payment_reference, status, payment_status, checkout_started_at)
    VALUES ('a0000000-0000-4000-8000-000000000002', _plan, 'buyer', _price, 'pix', 'DDP-REG-ATAQUE', 'payment_pending', 'pending', now());
  EXCEPTION WHEN OTHERS THEN _ok := true; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T12 membro não cria solicitação com checkout iniciado', _ok, _m);
END $$;

-- T13: membro não altera a própria solicitação (não há policy de UPDATE para membros).
DO $$
DECLARE _n integer;
DECLARE _plan uuid; _price numeric;
BEGIN
  SELECT id, price INTO _plan, _price FROM public.membership_plans WHERE active ORDER BY sort_order LIMIT 1;
  INSERT INTO public.membership_requests
    (user_id, plan_id, requested_role, amount, payment_method, payment_reference, status, payment_status)
  VALUES ('a0000000-0000-4000-8000-000000000002', _plan, 'buyer', _price, 'pix', 'DDP-REG-0001', 'payment_pending', 'pending');

  SET ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
  UPDATE public.membership_requests SET payment_status = 'paid', status = 'approved'
   WHERE payment_reference = 'DDP-REG-0001';
  GET DIAGNOSTICS _n = ROW_COUNT;
  RESET ROLE;
  PERFORM pg_temp.registra('T13 membro não altera a própria solicitação', _n = 0, 'linhas alteradas: ' || _n);
END $$;

-- T14: referência de cobrança não se repete.
DO $$
DECLARE _ok boolean := false; _m text := 'inseriu';
DECLARE _plan uuid; _price numeric;
BEGIN
  SELECT id, price INTO _plan, _price FROM public.membership_plans WHERE active ORDER BY sort_order LIMIT 1;
  BEGIN
    INSERT INTO public.membership_requests
      (user_id, plan_id, requested_role, amount, payment_method, payment_reference)
    VALUES ('a0000000-0000-4000-8000-000000000002', _plan, 'buyer', _price, 'pix', 'DDP-REG-0001');
  EXCEPTION WHEN unique_violation THEN _ok := true; _m := SQLERRM;
  END;
  PERFORM pg_temp.registra('T14 referência de cobrança única', _ok, _m);
END $$;

-- T15: pagamento que chega depois de recusa reabre a análise (não é ignorado).
DO $$
DECLARE _res jsonb; _status text; _pay text;
BEGIN
  UPDATE public.membership_requests SET status = 'rejected' WHERE payment_reference = 'DDP-REG-0001';
  SET ROLE service_role;
  SELECT public.gateway_apply_payment('asaas', 'evt-reg-1', 'PAYMENT_RECEIVED', 'DDP-REG-0001', 'paid',
    (SELECT amount FROM public.membership_requests WHERE payment_reference = 'DDP-REG-0001')) INTO _res;
  RESET ROLE;
  SELECT status::text, payment_status::text INTO _status, _pay FROM public.membership_requests WHERE payment_reference = 'DDP-REG-0001';
  PERFORM pg_temp.registra('T15 pagamento tardio reabre análise',
    _res->>'status' = 'paid_reopened' AND _status = 'in_review' AND _pay = 'paid',
    'resultado: ' || (_res->>'status') || ', situação: ' || _status);
END $$;

-- T16: webhook com valor menor que o cobrado não confirma.
DO $$
DECLARE _res jsonb;
BEGIN
  SET ROLE service_role;
  SELECT public.gateway_apply_payment('asaas', 'evt-reg-2', 'PAYMENT_RECEIVED', 'DDP-REG-0001', 'paid', 0.01) INTO _res;
  RESET ROLE;
  PERFORM pg_temp.registra('T16 webhook com valor divergente não confirma', _res->>'status' = 'amount_mismatch', _res::text);
END $$;

-- T17: webhook duplicado é ignorado (idempotência por evento).
DO $$
DECLARE _res jsonb;
BEGIN
  SET ROLE service_role;
  SELECT public.gateway_apply_payment('asaas', 'evt-reg-1', 'PAYMENT_RECEIVED', 'DDP-REG-0001', 'paid', 149) INTO _res;
  RESET ROLE;
  PERFORM pg_temp.registra('T17 evento duplicado não reprocessa', _res->>'status' = 'duplicate', _res::text);
END $$;

-- T18: webhook não é executável por authenticated nem anon.
DO $$
DECLARE _ok boolean := false; _m text := 'executou';
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM public.gateway_apply_payment('asaas', 'evt-reg-x', 'PAYMENT_RECEIVED', 'DDP-REG-0001', 'paid', 1);
  EXCEPTION WHEN insufficient_privilege THEN _ok := true; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T18 webhook fechado a authenticated', _ok, _m);
END $$;

-- T19: fotos de anúncio não aprovado não são listáveis por anônimo; as de anúncio aprovado são.
INSERT INTO public.listings (seller_id, category_id, title, slug, brand, model, manufacture_year, condition, price, city, state, status, published_at)
SELECT 'a0000000-0000-4000-8000-000000000001', c.id, 'Teste aprovado', 'teste-reg-aprovado', 'Marca', 'M1', 2020, 'used', 1000, 'Cidade', 'UF', 'approved', now()
  FROM public.categories c LIMIT 1;
INSERT INTO public.listings (seller_id, category_id, title, slug, brand, model, manufacture_year, condition, price, city, state, status)
SELECT 'a0000000-0000-4000-8000-000000000001', c.id, 'Teste rascunho', 'teste-reg-rascunho', 'Marca', 'M2', 2020, 'used', 1000, 'Cidade', 'UF', 'draft'
  FROM public.categories c LIMIT 1;
INSERT INTO public.listing_media (listing_id, media_type, url, is_cover, sort_order)
SELECT l.id, 'image', 'https://exemplo.invalid/storage/v1/object/sign/listing-photos/a0000000-0000-4000-8000-000000000001/aprovado/foto.jpg?token=x', true, 0
  FROM public.listings l WHERE l.slug = 'teste-reg-aprovado';
INSERT INTO public.listing_media (listing_id, media_type, url, is_cover, sort_order)
SELECT l.id, 'image', 'https://exemplo.invalid/storage/v1/object/sign/listing-photos/a0000000-0000-4000-8000-000000000001/rascunho/foto.jpg?token=y', true, 0
  FROM public.listings l WHERE l.slug = 'teste-reg-rascunho';
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('listing-photos', 'a0000000-0000-4000-8000-000000000001/aprovado/foto.jpg'),
  ('listing-photos', 'a0000000-0000-4000-8000-000000000001/rascunho/foto.jpg');
DO $$
DECLARE _anon integer; _dono integer;
BEGIN
  SET ROLE anon;
  SELECT count(*) INTO _anon FROM storage.objects WHERE bucket_id = 'listing-photos';
  RESET ROLE;
  SET ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
  SELECT count(*) INTO _dono FROM storage.objects WHERE bucket_id = 'listing-photos';
  RESET ROLE;
  PERFORM pg_temp.registra('T19 anônimo lista só fotos de anúncio aprovado',
    _anon = 1, 'anônimo viu: ' || _anon || ' (dono viu: ' || _dono || ')');
END $$;

-- T20: tabela de uso de IA é privada (somente servidor).
DO $$
DECLARE _ok boolean := false; _m text := 'leu';
BEGIN
  BEGIN
    SET ROLE authenticated;
    PERFORM count(*) FROM public.ai_usage_events;
  EXCEPTION WHEN insufficient_privilege THEN _ok := true; _m := SQLERRM;
  END;
  RESET ROLE;
  PERFORM pg_temp.registra('T20 uso de IA privado', _ok, _m);
END $$;

SELECT teste, status, detalhe FROM resultados ORDER BY ordem;
SELECT count(*) FILTER (WHERE status = 'PASS') AS aprovados, count(*) AS total FROM resultados;

ROLLBACK;
