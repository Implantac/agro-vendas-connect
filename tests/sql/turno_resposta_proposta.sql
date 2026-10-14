-- Regressão: de quem é a vez de responder uma proposta (migration 20261014120000).
-- Regra: 'open' -> só o vendedor aceita, recusa ou contrapõe; o comprador só cancela.
--        'countered' -> responde quem NÃO fez a última contraproposta.
-- Usa as contas fictícias de tests/sql/fixtures/02_contas_teste.sql. Termina com ROLLBACK.

BEGIN;

CREATE TEMP TABLE _tr_results (nome text, ok boolean, detalhe text) ON COMMIT DROP;
GRANT ALL ON _tr_results TO authenticated, service_role;

-- Tenta uma ação como um usuário e registra se o resultado (aceito/bloqueado) é o esperado.
CREATE OR REPLACE FUNCTION pg_temp.tenta(
  _p uuid, _ator uuid, _acao text, _valor numeric, _esperado boolean, _nome text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  _ok boolean;
  _msg text;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _ator, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.respond_proposal(_p, _acao, _valor);
    _ok := true;
    _msg := 'aceita';
  EXCEPTION WHEN OTHERS THEN
    _ok := false;
    _msg := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  INSERT INTO _tr_results VALUES (_nome, _ok = _esperado, _msg);
END $$;

DO $$
DECLARE
  vendedor uuid;
  comprador uuid;
  intruso  uuid := gen_random_uuid();
  l_id uuid;
  p_b_acc uuid; p_b_rej uuid; p_b_cnt uuid; p_cancel uuid;
  p_s_acc uuid; p_s_cnt uuid; p_cc uuid;
  st text;
BEGIN
  SELECT id INTO vendedor FROM public.profiles WHERE email = 'vendedor.teste@example.invalid';
  SELECT id INTO comprador FROM public.profiles WHERE email = 'comprador.teste@example.invalid';
  IF vendedor IS NULL OR comprador IS NULL THEN
    RAISE EXCEPTION 'Contas de teste não encontradas';
  END IF;

  INSERT INTO public.listings (seller_id, title, slug, description, price, status, published_at)
  VALUES (vendedor, 'Anúncio turno', 'anuncio-turno-' || substr(gen_random_uuid()::text, 1, 8),
          'Anúncio temporário de teste', 100000, 'approved', now())
  RETURNING id INTO l_id;

  -- Uma proposta aberta para cada cenário (todas criadas pelo comprador, status 'open').
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status, expires_at)
  VALUES (l_id, comprador, vendedor, 90000, 'open', now() + interval '48 hours') RETURNING id INTO p_b_acc;
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status, expires_at)
  VALUES (l_id, comprador, vendedor, 90000, 'open', now() + interval '48 hours') RETURNING id INTO p_b_rej;
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status, expires_at)
  VALUES (l_id, comprador, vendedor, 90000, 'open', now() + interval '48 hours') RETURNING id INTO p_b_cnt;
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status, expires_at)
  VALUES (l_id, comprador, vendedor, 90000, 'open', now() + interval '48 hours') RETURNING id INTO p_cancel;
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status, expires_at)
  VALUES (l_id, comprador, vendedor, 90000, 'open', now() + interval '48 hours') RETURNING id INTO p_s_acc;
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status, expires_at)
  VALUES (l_id, comprador, vendedor, 90000, 'open', now() + interval '48 hours') RETURNING id INTO p_s_cnt;
  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status, expires_at)
  VALUES (l_id, comprador, vendedor, 90000, 'open', now() + interval '48 hours') RETURNING id INTO p_cc;

  -- Cenário 1: em 'open', o comprador não responde a própria proposta.
  PERFORM pg_temp.tenta(p_b_acc, comprador, 'accepted', NULL, false, 'comprador não aceita a própria proposta aberta');
  PERFORM pg_temp.tenta(p_b_rej, comprador, 'rejected', NULL, false, 'comprador não recusa a própria proposta aberta');
  PERFORM pg_temp.tenta(p_b_cnt, comprador, 'countered', 95000, false, 'comprador não contrapõe a própria proposta aberta');
  PERFORM pg_temp.tenta(p_b_acc, intruso, 'accepted', NULL, false, 'terceiro não aceita proposta');

  -- Cenário 2: o comprador pode cancelar a própria proposta aberta.
  PERFORM pg_temp.tenta(p_cancel, comprador, 'cancelled', NULL, true, 'comprador cancela a própria proposta aberta');

  -- Cenário 3: em 'open', o vendedor aceita.
  PERFORM pg_temp.tenta(p_s_acc, vendedor, 'accepted', NULL, true, 'vendedor aceita proposta aberta');

  -- Cenário 4: vendedor contrapõe; depois ele mesmo não responde a própria contraproposta; comprador aceita.
  PERFORM pg_temp.tenta(p_s_cnt, vendedor, 'countered', 95000, true, 'vendedor contrapõe proposta aberta');
  PERFORM pg_temp.tenta(p_s_cnt, vendedor, 'accepted', NULL, false, 'vendedor não aceita a própria contraproposta');
  PERFORM pg_temp.tenta(p_s_cnt, comprador, 'accepted', NULL, true, 'comprador aceita contraproposta do vendedor');

  -- Cenário 5: contraproposta em ida e volta. Quem contrapôs por último não responde.
  PERFORM pg_temp.tenta(p_cc, vendedor, 'countered', 95000, true, 'vendedor contrapõe (ida)');
  PERFORM pg_temp.tenta(p_cc, comprador, 'countered', 97000, true, 'comprador contrapõe de volta (volta)');
  PERFORM pg_temp.tenta(p_cc, comprador, 'accepted', NULL, false, 'comprador não aceita a própria contraproposta de volta');
  PERFORM pg_temp.tenta(p_cc, vendedor, 'accepted', NULL, true, 'vendedor aceita a contraproposta do comprador');
END $$;

RESET role;
SELECT nome, ok, detalhe FROM _tr_results ORDER BY nome;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS resultado FROM _tr_results;

ROLLBACK;
