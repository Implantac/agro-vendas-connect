CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  alerts_enabled boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches_own_all" ON public.saved_searches
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_searches_admin_read" ON public.saved_searches
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);

CREATE TRIGGER trg_saved_searches_updated
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.notify_saved_searches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s record;
  _cat_slug text;
  f jsonb;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  SELECT c.slug INTO _cat_slug FROM public.categories c WHERE c.id = NEW.category_id;

  FOR s IN
    SELECT * FROM public.saved_searches ss
     WHERE ss.alerts_enabled
       AND ss.user_id <> NEW.seller_id
  LOOP
    f := s.filters_json;

    CONTINUE WHEN COALESCE(f->>'categoria','') <> '' AND COALESCE(_cat_slug,'') <> (f->>'categoria');
    CONTINUE WHEN COALESCE(f->>'uf','') <> '' AND COALESCE(NEW.state,'') <> (f->>'uf');
    CONTINUE WHEN COALESCE(f->>'condicao','') <> '' AND NEW.condition::text <> (f->>'condicao');
    CONTINUE WHEN (f->>'preco_min') IS NOT NULL AND (NEW.price IS NULL OR NEW.price < (f->>'preco_min')::numeric);
    CONTINUE WHEN (f->>'preco_max') IS NOT NULL AND (NEW.price IS NULL OR NEW.price > (f->>'preco_max')::numeric);
    CONTINUE WHEN (f->>'ano_min') IS NOT NULL AND (NEW.manufacture_year IS NULL OR NEW.manufacture_year < (f->>'ano_min')::int);
    CONTINUE WHEN (f->>'ano_max') IS NOT NULL AND (NEW.manufacture_year IS NULL OR NEW.manufacture_year > (f->>'ano_max')::int);
    CONTINUE WHEN COALESCE(f->>'q','') <> '' AND NOT (
      (COALESCE(NEW.title,'') || ' ' || COALESCE(NEW.brand,'') || ' ' || COALESCE(NEW.model,'')) ILIKE '%' || (f->>'q') || '%'
    );
    CONTINUE WHEN jsonb_typeof(f->'marcas') = 'array'
       AND jsonb_array_length(f->'marcas') > 0
       AND NOT (COALESCE(NEW.brand,'') IN (SELECT jsonb_array_elements_text(f->'marcas')));

    INSERT INTO public.notifications (user_id, type, title, message, action_url)
    VALUES (s.user_id, 'saved_search',
            'Nova máquina para "' || s.name || '"',
            NEW.title,
            '/implementos/' || NEW.slug);

    UPDATE public.saved_searches SET last_notified_at = now() WHERE id = s.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listings_saved_search_alerts
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_saved_searches();