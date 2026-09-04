DROP POLICY IF EXISTS "Planos ativos sao publicos" ON public.membership_plans;

CREATE POLICY "membership_plans_anon_read"
  ON public.membership_plans FOR SELECT TO anon
  USING (active);

CREATE POLICY "membership_plans_auth_read"
  ON public.membership_plans FOR SELECT TO authenticated
  USING (active OR public.is_admin());

GRANT SELECT ON public.membership_plans TO anon, authenticated;
GRANT ALL ON public.membership_plans TO service_role;