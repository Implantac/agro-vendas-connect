CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar papel ou status de um perfil';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_privileged_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_privileged_fields ON public.profiles;
CREATE TRIGGER guard_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_fields();