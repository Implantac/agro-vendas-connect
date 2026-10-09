-- Testes de ataque adicionais (auditoria). Cenário criado como superusuário;
-- ataques executados com os papéis reais anon / authenticated. Termina com ROLLBACK.
--
-- ESTADO ESPERADO (após as migrations 20261009100000 a 20261009100300): todos os itens
-- com resultado "bloqueado". Antes da correção, os itens 2 e 11 davam FALHA.
-- Qualquer "FALHA" aqui é regressão de segurança.
BEGIN;
CREATE TEMP TABLE _res (id serial, nome text, esperado text, resultado text, detalhe text) ON COMMIT DROP;
GRANT ALL ON _res TO authenticated, anon;
GRANT USAGE ON SEQUENCE _res_id_seq TO authenticated, anon;

-- ===== cenário (superusuário). Usuários criados em modo normal (trigger handle_new_user cria o perfil);
-- só as atualizações de privilégio usam session_replication_role=replica, pois são setup, não ataque.
DO $$
DECLARE uA uuid := gen_random_uuid(); uB uuid := gen_random_uuid(); plan uuid;
BEGIN
  INSERT INTO auth.users (id,email) VALUES (uA,'atacante@example.invalid'),(uB,'vendedor2@example.invalid');
  IF (SELECT count(*) FROM public.profiles WHERE id IN (uA,uB)) <> 2 THEN RAISE EXCEPTION 'setup: perfis não criados pelo trigger'; END IF;
  SET LOCAL session_replication_role = replica;
  UPDATE public.profiles SET status='approved', role='buyer' WHERE id=uA;
  UPDATE public.profiles SET status='approved', role='seller' WHERE id=uB;
  SET LOCAL session_replication_role = origin;
  PERFORM set_config('app.uA', uA::text, false);
  PERFORM set_config('app.uB', uB::text, false);
  SELECT id INTO plan FROM public.membership_plans LIMIT 1;
  PERFORM set_config('app.plan', coalesce(plan::text,''), false);
END $$;

-- ===== ATAQUE 1: usuário comum tenta se auto-aprovar e virar admin via UPDATE em profiles =====
DO $$
DECLARE ua uuid := current_setting('app.uA')::uuid; n int;
BEGIN
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',ua,'role','authenticated')::text, true);
  BEGIN
    UPDATE public.profiles SET status='approved', role='admin' WHERE id=ua;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('auto-aprovação/escalada via UPDATE em profiles','bloqueado', CASE WHEN n=0 THEN 'bloqueado' ELSE 'FALHA' END, n||' linhas');
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('auto-aprovação/escalada via UPDATE em profiles','bloqueado','bloqueado', SQLERRM);
  END;
END $$;
RESET ROLE;

-- ===== ATAQUE 2: usuário cria por conta própria solicitação "paga" e "aprovada" =====
DO $$
DECLARE ua uuid := current_setting('app.uA')::uuid; plan uuid := nullif(current_setting('app.plan'),'')::uuid; rid uuid;
BEGIN
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',ua,'role','authenticated')::text, true);
  BEGIN
    INSERT INTO public.membership_requests(user_id, plan_id, requested_role, status, amount, payment_method, payment_status, payment_confirmed_by, paid_at, payment_reference)
    VALUES (ua, plan, 'seller', 'approved', 0.01, 'pix', 'paid', 'admin', now(), 'FORJADO-'||substr(md5(random()::text),1,8))
    RETURNING id INTO rid;
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('solicitação forjada paga/aprovada pelo próprio usuário','bloqueado','FALHA','inserida id '||rid);
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('solicitação forjada paga/aprovada pelo próprio usuário','bloqueado','bloqueado', SQLERRM);
  END;
END $$;
RESET ROLE;

-- ===== ATAQUE 3: usuário comum chama RPCs restritas (gateway, confirmação admin, revisão admin) =====
DO $$
DECLARE ua uuid := current_setting('app.uA')::uuid;
BEGIN
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',ua,'role','authenticated')::text, true);
  BEGIN
    PERFORM public.gateway_apply_payment('asaas','evt-forjado-1','PAYMENT_CONFIRMED','ref-x','paid',999999,'{}'::jsonb);
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('authenticated chama gateway_apply_payment','bloqueado','FALHA','executou');
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('authenticated chama gateway_apply_payment','bloqueado','bloqueado', SQLERRM);
  END;
  BEGIN
    PERFORM public.admin_confirm_membership_payment(gen_random_uuid(),'pix','x');
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('não-admin chama admin_confirm_membership_payment','bloqueado','FALHA','executou');
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('não-admin chama admin_confirm_membership_payment','bloqueado','bloqueado', SQLERRM);
  END;
  BEGIN
    PERFORM public.admin_review_membership(gen_random_uuid(), true, 'x');
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('não-admin chama admin_review_membership','bloqueado','FALHA','executou');
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('não-admin chama admin_review_membership','bloqueado','bloqueado', SQLERRM);
  END;
END $$;
RESET ROLE;

-- ===== ATAQUE 4: anônimo =====
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('role','anon',true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SELECT count(*) INTO n FROM public.profiles;
  INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('anônimo lê profiles','0 linhas', CASE WHEN n=0 THEN 'bloqueado' ELSE 'FALHA' END, n||' linhas');
  SELECT count(*) INTO n FROM public.membership_requests;
  INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('anônimo lê membership_requests','0 linhas', CASE WHEN n=0 THEN 'bloqueado' ELSE 'FALHA' END, n||' linhas');
  BEGIN
    INSERT INTO public.membership_requests(user_id, plan_id, requested_role, amount, payment_status)
    VALUES (gen_random_uuid(), NULL, 'seller', 1, 'pending');
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('anônimo insere membership_requests','bloqueado','FALHA','inseriu');
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('anônimo insere membership_requests','bloqueado','bloqueado', SQLERRM);
  END;
  BEGIN
    PERFORM public.log_system_event('x','y','z','{}'::jsonb, NULL::text);
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('anônimo chama log_system_event','bloqueado','FALHA','executou');
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('anônimo chama log_system_event','bloqueado','bloqueado', SQLERRM);
  END;
END $$;
RESET ROLE;

-- ===== ATAQUE 5: usuário comum lê perfis alheios sem negócio em andamento =====
DO $$
DECLARE ua uuid := current_setting('app.uA')::uuid; n int;
BEGIN
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',ua,'role','authenticated')::text, true);
  SELECT count(*) INTO n FROM public.profiles WHERE id <> ua;
  INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('usuário lê perfis alheios sem negócio','0 linhas', CASE WHEN n=0 THEN 'bloqueado' ELSE 'FALHA' END, n||' linhas visíveis');
END $$;
RESET ROLE;


-- ===== ATAQUE 6 (encadeado): solicitação forjada é aprovada por admin => perfil vira 'approved' sem pagamento real =====
DO $$
DECLARE ua uuid := current_setting('app.uA')::uuid; uc uuid := gen_random_uuid(); rid uuid; st text;
BEGIN
  INSERT INTO auth.users (id,email) VALUES (uc,'admin-teste@example.invalid');
  SET LOCAL session_replication_role = replica;
  INSERT INTO public.user_roles(user_id, role) VALUES (uc,'admin');
  SET LOCAL session_replication_role = origin;
  -- admin entra
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',uc,'role','authenticated')::text, true);
  BEGIN
    SELECT id INTO rid FROM public.membership_requests WHERE user_id = ua AND payment_reference LIKE 'FORJADO-%' ORDER BY created_at DESC LIMIT 1;
    IF rid IS NULL THEN RAISE EXCEPTION 'sem solicitação forjada (ataque 2 não ocorreu)'; END IF;
    PERFORM public.admin_review_membership(rid, true, 'aprovado após conferir pagamento');
    RESET ROLE;
    SELECT status::text INTO st FROM public.profiles WHERE id = ua;
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('CADEIA: solicitação forjada (sem dinheiro) aprovada pelo admin','bloqueado', CASE WHEN st='approved' THEN 'FALHA' ELSE 'bloqueado' END, 'perfil do atacante agora: '||coalesce(st,'(não lido)'));
    PERFORM set_config('role','authenticated',true);
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('CADEIA: solicitação forjada (sem dinheiro) aprovada pelo admin','bloqueado','bloqueado', SQLERRM);
  END;
END $$;
RESET ROLE;

SELECT id, nome, esperado, resultado, detalhe FROM _res ORDER BY id;
ROLLBACK;
