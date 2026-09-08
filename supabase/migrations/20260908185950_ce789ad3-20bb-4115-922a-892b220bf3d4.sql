DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.conversations_guard_parties()',
    'public.handle_new_user()',
    'public.listings_guard_seller()',
    'public.listings_track_price()',
    'public.log_listing_event()',
    'public.notify_saved_searches()',
    'public.orders_guard_financials()',
    'public.orders_guard_insert()',
    'public.profiles_guard_privileges()',
    'public.proposals_guard_insert()',
    'public.seller_profiles_guard()',
    'public.set_updated_at()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $$;