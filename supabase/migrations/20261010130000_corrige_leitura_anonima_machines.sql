-- Correção: visitante sem login não conseguia abrir o detalhe de um anúncio.
--
-- Sintoma (confirmado por leitura anônima no projeto): a consulta
--   listings?select=*,machines(...)  com a chave anônima
-- retorna 42501 "permission denied for function is_admin".
--
-- Causa: a policy machines_public_read vale para PUBLIC e chama public.is_admin().
-- O papel anon não tem EXECUTE em is_admin() (revogado de propósito nas migrations
-- 20260901211033 e 20260918165152). A policy é avaliada para anon e falha.
--
-- Correção: a policy pública deixa de chamar is_admin(). O acesso do admin passa a
-- ser uma policy separada, restrita a authenticated. Permissões de quem está logado
-- não mudam: dono, admin e anúncio aprovado continuam com o mesmo acesso.

DROP POLICY IF EXISTS machines_public_read ON public.machines;

CREATE POLICY machines_public_read ON public.machines
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.machine_id = machines.id AND l.status = 'approved'
    )
  );

CREATE POLICY machines_admin_read ON public.machines
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
