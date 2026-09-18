-- 1) Cadastro nunca pode criar um perfil de administrador
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _requested text := COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_user_meta_data->>'requested_role', 'buyer');
        _role public.member_role;
BEGIN
  -- "admin" (ou qualquer valor inválido) nunca é aceito na auto-inscrição.
  _role := CASE WHEN _requested = 'seller' THEN 'seller'::public.member_role
                ELSE 'buyer'::public.member_role END;

  INSERT INTO public.profiles (id, email, full_name, role, person_type, phone, city, state)
  VALUES (
    NEW.id,
    COALESCE(NEW.email,''),
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    _role,
    COALESCE((NEW.raw_user_meta_data->>'person_type')::public.person_type,'pf'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;

-- 2) Somente administradores concedem/removem o privilégio de admin
CREATE OR REPLACE FUNCTION public.guard_admin_role_grants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _target public.app_role;
BEGIN
  _target := COALESCE(NEW.role, OLD.role);
  IF _target = 'admin' AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem conceder ou remover o privilégio de administrador';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

DROP TRIGGER IF EXISTS trg_guard_admin_role_grants ON public.user_roles;
CREATE TRIGGER trg_guard_admin_role_grants
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_admin_role_grants();

REVOKE EXECUTE ON FUNCTION public.guard_admin_role_grants() FROM PUBLIC, anon, authenticated;