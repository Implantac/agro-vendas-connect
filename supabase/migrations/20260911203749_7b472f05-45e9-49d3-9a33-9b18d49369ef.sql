CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  brand text,
  model text,
  manufacture_year integer,
  condition public.listing_condition NOT NULL DEFAULT 'used',
  hours_used integer,
  technical_data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listings
  ADD COLUMN machine_id uuid REFERENCES public.machines(id) ON DELETE RESTRICT;
GRANT SELECT ON public.machines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;
GRANT ALL ON public.machines TO service_role;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "machines_public_read" ON public.machines
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.machine_id = machines.id AND l.status = 'approved'
    )
  );
CREATE POLICY "machines_owner_insert" ON public.machines
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.is_approved()
    AND public.my_member_role() = 'seller'
  );
CREATE POLICY "machines_owner_update" ON public.machines
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "machines_owner_delete" ON public.machines
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());
CREATE TRIGGER trg_machines_updated
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_machines_owner ON public.machines(owner_id);
CREATE INDEX idx_machines_category ON public.machines(category_id);
CREATE INDEX idx_listings_machine ON public.listings(machine_id);