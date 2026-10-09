-- Auditoria de 09/10/2026.
-- C-05: remove dados fictícios que as migrations anteriores semearam em produção:
--   a) 3 vendedores de demonstração (perfis com e-mail ".exemplo", empresas inventadas) e seus anúncios
--      (migrations 20260901211006 e 20260901235737);
--   b) 8 anúncios "-demo" e 8 máquinas marcadas como "verificadas" sem verificação real
--      (migration 20260918210403);
--   c) anúncios de "DDP AGRO Store" com descrição genérica e fotos de URLs inventadas,
--      inseridos sob o perfil admin pela migration 20260902011515 quando havia admin na época.
-- Regra de segurança: nada que tenha pedido (orders) ou proposta (proposals) é apagado.
-- Pagamento: a cobrança online volta a ficar desligada até as credenciais do provedor existirem.
--       A tela já trata esse estado (mostra o código da solicitação e orienta o contato).

DO $$
DECLARE
  _demo_owner constant uuid := '5c3d75a7-f724-44d2-805a-7059a1875b30';
  _demo_sellers constant uuid[] := ARRAY[
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333'
  ]::uuid[];
  _n_listings integer;
  _n_machines integer;
  _n_profiles integer;
BEGIN
  -- a) + b) + c): anúncios de origem fictícia sem pedido nem proposta.
  DELETE FROM public.listings l
   WHERE (
           l.seller_id = ANY (_demo_sellers)
        OR (l.seller_id = _demo_owner AND l.slug LIKE '%-demo')
        OR (l.description LIKE '%com garantia de revenda e suporte tecnico.'
            AND l.seller_id IN (SELECT id FROM public.profiles WHERE role = 'admin'))
         )
     AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.listing_id = l.id)
     AND NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.listing_id = l.id);
  GET DIAGNOSTICS _n_listings = ROW_COUNT;

  -- Máquinas dos perfis fictícios que ficaram sem anúncio (a FK de listings é RESTRICT).
  DELETE FROM public.machines m
   WHERE m.owner_id = ANY (array_append(_demo_sellers, _demo_owner))
     AND NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.machine_id = m.id);
  GET DIAGNOSTICS _n_machines = ROW_COUNT;

  -- Perfis de demonstração: removidos só se não houver mais nenhum vínculo de negócio.
  DELETE FROM public.seller_profiles sp
   WHERE sp.user_id = ANY (_demo_sellers)
     AND NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.seller_id = sp.user_id);

  DELETE FROM public.profiles p
   WHERE p.id = ANY (_demo_sellers)
     AND p.email LIKE '%.exemplo'
     AND NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.seller_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.buyer_id = p.id OR o.seller_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.proposals pr WHERE pr.buyer_id = p.id OR pr.seller_id = p.id);
  GET DIAGNOSTICS _n_profiles = ROW_COUNT;

  RAISE NOTICE 'Dados de demonstração removidos: % anúncio(s), % máquina(s), % perfil(is)',
    _n_listings, _n_machines, _n_profiles;
END $$;

-- Pagamento: cobrança online desligada até existirem credenciais e webhook configurados.
UPDATE public.app_settings
   SET value = '{"enabled": false, "provider": "asaas"}'::jsonb,
       updated_at = now()
 WHERE key = 'payments_enabled';
