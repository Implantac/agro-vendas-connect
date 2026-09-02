create policy "listing_photos_public_read" on storage.objects for select using (bucket_id = 'listing-photos');
create policy "listing_photos_owner_insert" on storage.objects for insert to authenticated with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing_photos_owner_update" on storage.objects for update to authenticated using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing_photos_owner_delete" on storage.objects for delete to authenticated using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists listings_seller_insert on public.listings;
create policy listings_seller_insert on public.listings for insert to authenticated
with check (seller_id = auth.uid() and is_approved() and (my_member_role() in ('seller','admin') or is_admin()));