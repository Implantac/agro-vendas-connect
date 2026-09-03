REVOKE EXECUTE ON FUNCTION public.shares_deal_with(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.shares_deal_with(uuid) TO authenticated;