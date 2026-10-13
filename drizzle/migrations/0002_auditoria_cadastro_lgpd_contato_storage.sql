-- Auditoria de 09/10/2026 — cadastro, LGPD, contato, Storage e uso de IA.
-- (Buckets já existentes; bloco de criação de buckets omitido.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _requested text := COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_user_meta_data->>'requested_role', 'buyer');
        _role public.member_role;
BEGIN
  _role := CASE WHEN _requested = 'seller' THEN 'seller'::public.member_role
                ELSE 'buyer'::public.member_role END;

  INSERT INTO public.profiles (id, email, full_name, role, person_type, phone, city, state)
  VALUES (
    NEW.id,
    COALESCE(NEW.email,''),
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    _role,
    COALESCE((NEW.raw_user_meta_data->>'person_type')::public.person_type,'pf'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data->>'legal_accept', 'false') = 'true' THEN
    INSERT INTO public.legal_acceptances (user_id, document_id, user_agent)
    SELECT NEW.id, d.id, LEFT(NEW.raw_user_meta_data->>'legal_user_agent', 400)
      FROM public.legal_documents d
     WHERE d.published
       AND d.doc_type IN ('terms', 'privacy', 'liability')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 255),
  details text NOT NULL CHECK (char_length(details) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_by uuid,
  handled_at timestamptz
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_messages_insert ON public.contact_messages;
CREATE POLICY contact_messages_insert ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS contact_messages_admin_select ON public.contact_messages;
CREATE POLICY contact_messages_admin_select ON public.contact_messages
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS contact_messages_admin_update ON public.contact_messages;
CREATE POLICY contact_messages_admin_update ON public.contact_messages
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.limit_public_requests_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _recent integer;
BEGIN
  SELECT count(*) INTO _recent FROM (
    SELECT 1 FROM public.privacy_requests
     WHERE lower(email) = lower(NEW.email) AND created_at > now() - interval '24 hours'
    UNION ALL
    SELECT 1 FROM public.contact_messages
     WHERE lower(email) = lower(NEW.email) AND created_at > now() - interval '24 hours'
  ) t;
  IF _recent >= 5 THEN
    RAISE EXCEPTION 'Muitas solicitações para este e-mail nas últimas 24 horas. Tente novamente depois.';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.limit_public_requests_by_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_privacy_requests_rate_limit ON public.privacy_requests;
CREATE TRIGGER trg_privacy_requests_rate_limit
  BEFORE INSERT ON public.privacy_requests
  FOR EACH ROW EXECUTE FUNCTION public.limit_public_requests_by_email();

DROP TRIGGER IF EXISTS trg_contact_messages_rate_limit ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_rate_limit
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.limit_public_requests_by_email();

CREATE OR REPLACE FUNCTION public.is_public_listing_photo(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.listing_media m
      JOIN public.listings l ON l.id = m.listing_id
     WHERE l.status = 'approved'
       AND position(_name IN m.url) > 0
  );
$$;

REVOKE ALL ON FUNCTION public.is_public_listing_photo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_listing_photo(text) TO anon, authenticated;

DROP POLICY IF EXISTS listing_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS listing_photos_read ON storage.objects;
DROP POLICY IF EXISTS listing_photos_read_anon ON storage.objects;
DROP POLICY IF EXISTS listing_photos_read_auth ON storage.objects;

CREATE POLICY listing_photos_read_anon ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'listing-photos' AND public.is_public_listing_photo(name));

CREATE POLICY listing_photos_read_auth ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR public.is_public_listing_photo(name)
    )
  );

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'listing_copy',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx ON public.ai_usage_events (user_id, created_at);
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_events FROM anon, authenticated;
