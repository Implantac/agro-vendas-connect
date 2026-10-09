-- Contas fictícias para as suítes de teste (domínio .invalid, nunca enviam e-mail).
-- Idempotente. Executado como superusuário, antes das suítes.
INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'vendedor.teste@example.invalid'),
  ('c0000000-0000-4000-8000-000000000002', 'comprador.teste@example.invalid')
ON CONFLICT (id) DO NOTHING;

-- Estado de produção simulado: vendedor aprovado e comprador aprovado.
-- session_replication_role = replica só na montagem do cenário, nunca no código da aplicação.
SET session_replication_role = replica;
UPDATE public.profiles SET status = 'approved', role = 'seller'
 WHERE id = 'c0000000-0000-4000-8000-000000000001';
UPDATE public.profiles SET status = 'approved', role = 'buyer'
 WHERE id = 'c0000000-0000-4000-8000-000000000002';
RESET session_replication_role;
