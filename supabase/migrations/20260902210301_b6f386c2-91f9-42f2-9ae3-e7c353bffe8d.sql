REVOKE ALL ON FUNCTION public.admin_set_member_role(uuid, public.member_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_member_role(uuid, public.member_role) TO authenticated;