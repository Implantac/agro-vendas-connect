-- Admins precisam poder gerenciar privilégios reais (user_roles)
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Sincroniza privilégio real ao definir o perfil de acesso
CREATE OR REPLACE FUNCTION public.admin_set_member_role(_user_id uuid, _role member_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar papéis';
  END IF;

  UPDATE public.profiles SET role = _role, updated_at = now() WHERE id = _user_id;

  IF _role = 'admin' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_member_role(uuid, member_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_member_role(uuid, member_role) TO authenticated;