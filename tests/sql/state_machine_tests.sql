-- Testes da máquina de estados (proposta e pedido) com duas contas reais — DDP AGRO
-- Vendedor: etcsuporte@hotmail.com | Comprador: silvaclaudinei005@gmail.com
-- Cria dados temporários, exercita as RPCs como cada usuário e termina com ROLLBACK.

BEGIN;

CREATE TEMP TABLE _sm_results (nome text, ok boolean, detalhe text) ON COMMIT DROP;
GRANT ALL ON _sm_results TO authenticated, service_role;

DO $$
DECLARE
  vendedor uuid;
  comprador uuid;
  intruso  uuid := gen_random_uuid();
  l_id uuid;
  p_id uuid;
  o_id uuid;
  st text;
  msg text;
BEGIN
  SELECT id INTO vendedor FROM public.profiles WHERE email = 'etcsuporte@hotmail.com';
  SELECT id INTO comprador FROM public.profiles WHERE email = 'silvaclaudinei005@gmail.com';
  IF vendedor IS NULL OR comprador IS NULL THEN
    RAISE EXCEPTION 'Contas de teste não encontradas';
  END IF;

  -- Dados base (como service_role)
  INSERT INTO public.listings (seller_id, title, slug, description, price, status, published_at)
  VALUES (vendedor, 'Plantadeira teste SM', 'plantadeira-teste-sm-' || substr(gen_random_uuid()::text, 1, 8),
          'Anúncio temporário de teste', 100000, 'approved', now())
  RETURNING id INTO l_id;

  INSERT INTO public.proposals (listing_id, buyer_id, seller_id, amount, status, expires_at)
  VALUES (l_id, comprador, vendedor, 90000, 'open', now() + interval '48 hours')
  RETURNING id INTO p_id;

  ----------------------------------------------------------------
  -- 1. Terceiro não pode responder a proposta
  ----------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', intruso, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.respond_proposal(p_id, 'accepted');
    INSERT INTO _sm_results VALUES ('terceiro não responde proposta', false, 'aceitou indevidamente');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _sm_results VALUES ('terceiro não responde proposta', true, SQLERRM);
  END;

  ----------------------------------------------------------------
  -- 2. Vendedor faz contraproposta (open -> countered)
  ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', vendedor, 'role', 'authenticated')::text, true);
  PERFORM public.respond_proposal(p_id, 'countered', 95000);
  SELECT status::text INTO st FROM public.proposals WHERE id = p_id;
  INSERT INTO _sm_results VALUES ('contraproposta do vendedor', st = 'countered', st);

  -- histórico registra o status anterior correto
  SELECT previous_status::text INTO st FROM public.proposal_events
   WHERE proposal_id = p_id ORDER BY created_at DESC LIMIT 1;
  INSERT INTO _sm_results VALUES ('histórico grava status anterior', st = 'open', coalesce(st, 'nulo'));

  ----------------------------------------------------------------
  -- 3. Vendedor não pode cancelar (só o comprador)
  ----------------------------------------------------------------
  BEGIN
    PERFORM public.respond_proposal(p_id, 'cancelled');
    INSERT INTO _sm_results VALUES ('vendedor não cancela proposta', false, 'cancelou indevidamente');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _sm_results VALUES ('vendedor não cancela proposta', true, SQLERRM);
  END;

  ----------------------------------------------------------------
  -- 4. Comprador aceita (countered -> accepted) e não reabre
  ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', comprador, 'role', 'authenticated')::text, true);
  PERFORM public.respond_proposal(p_id, 'accepted');
  SELECT status::text INTO st FROM public.proposals WHERE id = p_id;
  INSERT INTO _sm_results VALUES ('comprador aceita proposta', st = 'accepted', st);

  BEGIN
    PERFORM public.respond_proposal(p_id, 'countered', 80000);
    INSERT INTO _sm_results VALUES ('proposta encerrada não reabre', false, 'reabriu indevidamente');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _sm_results VALUES ('proposta encerrada não reabre', true, SQLERRM);
  END;

  ----------------------------------------------------------------
  -- Pedido gerado a partir da proposta aceita
  ----------------------------------------------------------------
  PERFORM set_config('role', 'service_role', true);
  INSERT INTO public.orders (proposal_id, listing_id, buyer_id, seller_id, amount, commission_amount, seller_net_amount, status)
  VALUES (p_id, l_id, comprador, vendedor, 95000, 3800, 91200, 'created')
  RETURNING id INTO o_id;
  PERFORM set_config('role', 'authenticated', true);

  ----------------------------------------------------------------
  -- 5. Terceiro não altera pedido
  ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', intruso, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.set_order_status(o_id, 'awaiting_payment');
    INSERT INTO _sm_results VALUES ('terceiro não altera pedido', false, 'alterou indevidamente');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _sm_results VALUES ('terceiro não altera pedido', true, SQLERRM);
  END;

  ----------------------------------------------------------------
  -- 6. Transição válida: created -> awaiting_payment (comprador)
  ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', comprador, 'role', 'authenticated')::text, true);
  PERFORM public.set_order_status(o_id, 'awaiting_payment');
  SELECT status::text INTO st FROM public.orders WHERE id = o_id;
  INSERT INTO _sm_results VALUES ('pedido vai para aguardando pagamento', st = 'awaiting_payment', st);

  ----------------------------------------------------------------
  -- 7. Usuário comum não confirma pagamento
  ----------------------------------------------------------------
  BEGIN
    PERFORM public.set_order_status(o_id, 'paid');
    INSERT INTO _sm_results VALUES ('usuário não confirma pagamento', false, 'confirmou indevidamente');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _sm_results VALUES ('usuário não confirma pagamento', true, SQLERRM);
  END;

  ----------------------------------------------------------------
  -- 8. Salto de etapa bloqueado (awaiting_payment -> completed)
  ----------------------------------------------------------------
  BEGIN
    PERFORM public.set_order_status(o_id, 'completed');
    INSERT INTO _sm_results VALUES ('salto de etapa bloqueado', false, 'pulou etapas');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _sm_results VALUES ('salto de etapa bloqueado', true, SQLERRM);
  END;

  ----------------------------------------------------------------
  -- 9. Cancelamento permitido e estado final é imutável
  ----------------------------------------------------------------
  PERFORM public.set_order_status(o_id, 'cancelled');
  SELECT status::text INTO st FROM public.orders WHERE id = o_id;
  INSERT INTO _sm_results VALUES ('pedido cancelado pelo comprador', st = 'cancelled', st);

  BEGIN
    PERFORM public.set_order_status(o_id, 'in_delivery');
    INSERT INTO _sm_results VALUES ('pedido cancelado é final', false, 'reativou indevidamente');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _sm_results VALUES ('pedido cancelado é final', true, SQLERRM);
  END;

  ----------------------------------------------------------------
  -- 10. Eventos de pedido registrados
  ----------------------------------------------------------------
  PERFORM set_config('role', 'service_role', true);
  SELECT count(*)::text INTO msg FROM public.order_events WHERE order_id = o_id;
  INSERT INTO _sm_results VALUES ('eventos de pedido registrados', msg::int >= 2, msg || ' eventos');
END $$;

RESET role;
SELECT nome, ok, detalhe FROM _sm_results ORDER BY nome;
SELECT count(*) FILTER (WHERE ok) || '/' || count(*) AS resultado FROM _sm_results;

ROLLBACK;
