-- Ciclo de pagamento da membresia com o caminho legítimo do webhook (service_role).
--
-- ESTADO ESPERADO (após as migrations 20261009100000 a 20261009100300): item 1 "bloqueado"
-- e item 2 "ok" (estorno revoga o acesso). Antes da correção, os dois davam FALHA.
-- Qualquer "FALHA" aqui é regressão.
-- Verifica: (a) estorno/chargeback após aprovação revoga acesso? (b) admin aprova sem pagamento confirmado?
BEGIN;
CREATE TEMP TABLE _res (id serial, nome text, esperado text, resultado text, detalhe text) ON COMMIT DROP;
GRANT ALL ON _res TO authenticated, anon, service_role;
GRANT USAGE ON SEQUENCE _res_id_seq TO authenticated, anon, service_role;

DO $$
DECLARE u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); uadm uuid := gen_random_uuid();
        plan uuid; r1 uuid; r2 uuid; amt numeric; st text; ps text; ms text;
BEGIN
  INSERT INTO auth.users (id,email) VALUES (u1,'comprador-estorno@example.invalid'),(u2,'sem-pagamento@example.invalid'),(uadm,'admin2@example.invalid');
  SET LOCAL session_replication_role = replica;
  INSERT INTO public.user_roles(user_id, role) VALUES (uadm,'admin');
  SET LOCAL session_replication_role = origin;
  SELECT id INTO plan FROM public.membership_plans WHERE active LIMIT 1;

  -- solicitações legítimas criadas pelos próprios usuários (caminho normal do app)
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',u1,'role','authenticated')::text, true);
  INSERT INTO public.membership_requests(user_id, plan_id, requested_role, amount, payment_method, payment_reference)
    VALUES (u1, plan, 'seller', (SELECT price FROM public.membership_plans WHERE id=plan), 'pix', 'REF-ESTORNO-'||substr(md5(random()::text),1,6))
    RETURNING id, amount INTO r1, amt;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',u2,'role','authenticated')::text, true);
  INSERT INTO public.membership_requests(user_id, plan_id, requested_role, amount, payment_method, payment_reference)
    VALUES (u2, plan, 'seller', (SELECT price FROM public.membership_plans WHERE id=plan), 'pix', 'REF-SEMPAG-'||substr(md5(random()::text),1,6))
    RETURNING id INTO r2;
  RESET ROLE;

  -- webhook confirma pagamento de u1 (service_role)
  PERFORM set_config('role','service_role',true);
  PERFORM public.gateway_apply_payment('asaas','evt-1','PAYMENT_CONFIRMED',
     (SELECT payment_reference FROM public.membership_requests WHERE id=r1),'paid',amt,'{}'::jsonb);
  -- admin aprova u1
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',uadm,'role','authenticated')::text, true);
  PERFORM public.admin_review_membership(r1, true, 'ok');
  -- admin aprova u2 SEM pagamento (o banco deveria impedir)
  BEGIN
    PERFORM public.admin_review_membership(r2, true, 'aprovado sem pagamento');
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('admin aprova membresia sem pagamento confirmado (banco)','bloqueado','FALHA','aprovação aceita pelo banco');
  EXCEPTION WHEN others THEN
    INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('admin aprova membresia sem pagamento confirmado (banco)','bloqueado','bloqueado', SQLERRM);
  END;
  RESET ROLE;

  -- estorno (webhook PAYMENT_REFUNDED) de u1, depois de aprovado
  PERFORM set_config('role','service_role',true);
  PERFORM public.gateway_apply_payment('asaas','evt-2','PAYMENT_REFUNDED',
     (SELECT payment_reference FROM public.membership_requests WHERE id=r1),'refunded',amt,'{}'::jsonb);
  RESET ROLE;

  SELECT p.status::text, mr.payment_status::text, mr.status::text INTO st, ps, ms
    FROM public.profiles p JOIN public.membership_requests mr ON mr.user_id=p.id WHERE p.id=u1;
  INSERT INTO _res(nome,esperado,resultado,detalhe) VALUES ('estorno revoga acesso do membro aprovado','profiles.status <> approved',
     CASE WHEN st='approved' THEN 'FALHA' ELSE 'ok' END,
     'após estorno: profiles.status='||st||', payment_status='||ps||', request.status='||ms);
END $$;

SELECT id, nome, esperado, resultado, detalhe FROM _res ORDER BY id;
ROLLBACK;
