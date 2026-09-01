
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_member_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_member_role() TO authenticated;

-- anon precisa ler apenas anúncios aprovados: remove dependência de is_admin() para anônimos
DROP POLICY "listings_public_read" ON public.listings;
CREATE POLICY "listings_anon_read_approved" ON public.listings FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "listings_auth_read" ON public.listings FOR SELECT TO authenticated USING (status = 'approved' OR seller_id = auth.uid() OR public.is_admin());

DROP POLICY "categories_public_read" ON public.categories;
CREATE POLICY "categories_anon_read" ON public.categories FOR SELECT TO anon USING (active);
CREATE POLICY "categories_auth_read" ON public.categories FOR SELECT TO authenticated USING (active OR public.is_admin());

DROP POLICY "legal_documents_read" ON public.legal_documents;
CREATE POLICY "legal_documents_anon_read" ON public.legal_documents FOR SELECT TO anon USING (published);
CREATE POLICY "legal_documents_auth_read" ON public.legal_documents FOR SELECT TO authenticated USING (published OR public.is_admin());
