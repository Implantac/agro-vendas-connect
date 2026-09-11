CREATE OR REPLACE FUNCTION public.sync_machine_to_listings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.listings
  SET category_id = NEW.category_id,
      brand = NEW.brand,
      model = NEW.model,
      manufacture_year = NEW.manufacture_year,
      condition = NEW.condition,
      hours_used = NEW.hours_used,
      technical_data_json = NEW.technical_data_json
  WHERE machine_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_machine_to_listings
  AFTER UPDATE OF category_id, brand, model, manufacture_year, condition, hours_used, technical_data_json
  ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.sync_machine_to_listings();

REVOKE ALL ON FUNCTION public.sync_machine_to_listings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_machine_to_listings() TO service_role;