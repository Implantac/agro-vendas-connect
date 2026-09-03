CREATE OR REPLACE FUNCTION public.admin_set_member_role(_user_id uuid, _role member_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _self boolean := (_user_id = auth.uid());
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar papéis';
  END IF;

  UPDATE public.profiles SET role = _role, status = 'approved', updated_at = now() WHERE id = _user_id;

  IF _role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NOT _self THEN
    -- Administradores mantêm o privilégio ao alternar o próprio perfil (modo teste).
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (auth.uid(), 'member_role_changed', 'profile', _user_id,
          jsonb_build_object('role', _role, 'self', _self));
END;
$function$;