-- Auditoria de 09/10/2026 — base de segurança do banco.
--
-- 1) Privilégios de tabela: o Supabase concede ALL a anon/authenticated por padrão.
--    RLS não governa TRUNCATE, REFERENCES nem TRIGGER: um usuário logado conseguia
--    apagar todas as linhas de qualquer tabela sem FK (comprovado em réplica).
--    INSERT/SELECT/UPDATE/DELETE continuam limitados pelas policies de RLS.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- 2) Guards de perfil. O service role (usado pelas server functions administrativas) não tem
--    auth.uid(), então os dois guards de profiles bloqueavam qualquer mudança de status/papel feita
--    pelo servidor. As duas funções passam a SECURITY INVOKER: assim current_user é o papel de quem
--    chamou (em SECURITY DEFINER, current_user seria o dono da função e a checagem ficaria inútil).
--    Liberamos somente service_role, supabase_admin e postgres. anon e authenticated não assumem esses
--    papéis, e as duas funções SECURITY DEFINER que alteram profiles (admin_review_membership e
--    admin_set_member_role) já exigem admin.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status)
     AND current_user NOT IN ('service_role', 'supabase_admin', 'postgres')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar papel ou status de um perfil';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profiles_guard_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN RETURN NEW; END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Papel e status do membro só podem ser alterados pela administração';
  END IF;
  RETURN NEW;
END;
$function$;
