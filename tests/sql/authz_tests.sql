-- Testes de autorização (ataques deliberados) — DDP AGRO
-- Executa como um usuário autenticado qualquer (UUID aleatório, sem vínculo com os dados)
-- e prova que o banco impede leituras e escritas indevidas.
-- Uso: rodar todo o arquivo; ele termina com ROLLBACK e não altera dados.

BEGIN;

CREATE TEMP TABLE _authz_results (nome text, ok boolean, detalhe text) ON COMMIT DROP;
GRANT ALL ON _authz_results TO authenticated;

DO $$
DECLARE
  intruso uuid := gen_random_uuid();
  n int;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', intruso, 'role', 'authenticated')::text,
    true
  );

  -- 1. Não enxerga propostas de terceiros
  SELECT count(*) INTO n FROM public.proposals;
  INSERT INTO _authz_results VALUES ('proposta de terceiro invisível', n = 0, n || ' linhas');

  -- 2. Não enxerga pedidos de terceiros
  SELECT count(*) INTO n FROM public.orders;
  INSERT INTO _authz_results VALUES ('pedido de terceiro invisível', n = 0, n || ' linhas');

  -- 3. Não enxerga a auditoria
  SELECT count(*) INTO n FROM public.audit_logs;
  INSERT INTO _authz_results VALUES ('auditoria invisível', n = 0, n || ' linhas');

  -- 4. Não enxerga perfis de terceiros
  SELECT count(*) INTO n FROM public.profiles WHERE id <> intruso;
  INSERT INTO _authz_results VALUES ('perfis de terceiros invisíveis', n = 0, n || ' linhas');

  -- 5. Não altera anúncio alheio
  BEGIN
    UPDATE public.listings SET price = 1 WHERE status = 'approved';
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO _authz_results VALUES ('anúncio alheio protegido', n = 0, n || ' linhas alteradas');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _authz_results VALUES ('anúncio alheio protegido', true, 'bloqueado: ' || SQLERRM);
  END;

  -- 6. Não autoaprova anúncio
  BEGIN
    UPDATE public.listings SET status = 'approved' WHERE status = 'in_review';
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO _authz_results VALUES ('autoaprovação bloqueada', n = 0, n || ' linhas alteradas');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _authz_results VALUES ('autoaprovação bloqueada', true, 'bloqueado: ' || SQLERRM);
  END;

  -- 7. Não insere registro de auditoria
  BEGIN
    INSERT INTO public.audit_logs (action, entity_type) VALUES ('fake', 'test');
    INSERT INTO _authz_results VALUES ('auditoria protegida contra escrita', false, 'insert aceito');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _authz_results VALUES ('auditoria protegida contra escrita', true, SQLERRM);
  END;

  -- 8. Não cria notificação para terceiros
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (gen_random_uuid(), 'system', 'fake', 'fake');
    INSERT INTO _authz_results VALUES ('notificação forjada bloqueada', false, 'insert aceito');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _authz_results VALUES ('notificação forjada bloqueada', true, SQLERRM);
  END;

  -- 9. Não vira admin sozinho
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (intruso, 'admin');
    INSERT INTO _authz_results VALUES ('escalada de privilégio bloqueada', false, 'insert aceito');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _authz_results VALUES ('escalada de privilégio bloqueada', true, SQLERRM);
  END;

  -- 10. Não enxerga máquina alheia sem anúncio aprovado
  SELECT count(*) INTO n
  FROM public.machines m
  WHERE m.owner_id <> intruso
    AND NOT EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.machine_id = m.id AND l.status = 'approved'
    );
  INSERT INTO _authz_results VALUES ('máquina alheia privada invisível', n = 0, n || ' linhas');

  -- 11. Não cria máquina em nome de terceiro
  BEGIN
    INSERT INTO public.machines (owner_id, brand, model, condition)
    VALUES (gen_random_uuid(), 'Fake', 'Fake', 'used');
    INSERT INTO _authz_results VALUES ('máquina forjada bloqueada', false, 'insert aceito');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _authz_results VALUES ('máquina forjada bloqueada', true, SQLERRM);
  END;

  -- 12. Não altera máquina alheia
  BEGIN
    UPDATE public.machines SET brand = 'Hackeada' WHERE owner_id <> intruso;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO _authz_results VALUES ('máquina alheia protegida', n = 0, n || ' linhas alteradas');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _authz_results VALUES ('máquina alheia protegida', true, 'bloqueado: ' || SQLERRM);
  END;

  PERFORM set_config('role', 'postgres', true);
END $$;

SELECT nome, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultado, detalhe
FROM _authz_results ORDER BY nome;

ROLLBACK;
