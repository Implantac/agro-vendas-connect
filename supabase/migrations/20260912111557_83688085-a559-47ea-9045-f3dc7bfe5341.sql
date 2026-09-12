
DO $$ BEGIN
  CREATE TYPE public.machine_doc_type AS ENUM ('crlv','nota_fiscal','laudo_tecnico','manutencao','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.machine_doc_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.machine_verification AS ENUM ('unverified','pending','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS verification_status public.machine_verification NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.machine_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type public.machine_doc_type NOT NULL DEFAULT 'outro',
  title text,
  file_path text NOT NULL,
  file_name text,
  status public.machine_doc_status NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS machine_documents_machine_idx ON public.machine_documents(machine_id);
CREATE INDEX IF NOT EXISTS machine_documents_status_idx ON public.machine_documents(status);

GRANT SELECT, INSERT, DELETE ON public.machine_documents TO authenticated;
GRANT ALL ON public.machine_documents TO service_role;
ALTER TABLE public.machine_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY machine_documents_read ON public.machine_documents FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY machine_documents_insert ON public.machine_documents FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.owner_id = auth.uid())
  );
CREATE POLICY machine_documents_delete ON public.machine_documents FOR DELETE TO authenticated
  USING ((owner_id = auth.uid() AND status = 'pending') OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.machine_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date date NOT NULL DEFAULT current_date,
  title text NOT NULL,
  description text,
  hours_at_event integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS machine_events_machine_idx ON public.machine_events(machine_id, event_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_events TO authenticated;
GRANT ALL ON public.machine_events TO service_role;
ALTER TABLE public.machine_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY machine_events_read ON public.machine_events FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.listings l WHERE l.machine_id = machine_events.machine_id AND l.status = 'approved')
  );
CREATE POLICY machine_events_write ON public.machine_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.machines m WHERE m.id = machine_id AND m.owner_id = auth.uid()));
CREATE POLICY machine_events_update ON public.machine_events FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY machine_events_delete ON public.machine_events FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.refresh_machine_verification(_machine_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE aprovados int; pendentes int; rejeitados int; novo public.machine_verification;
BEGIN
  SELECT
    count(*) FILTER (WHERE status = 'approved'),
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'rejected')
  INTO aprovados, pendentes, rejeitados
  FROM public.machine_documents WHERE machine_id = _machine_id;

  novo := CASE
    WHEN aprovados > 0 THEN 'verified'
    WHEN pendentes > 0 THEN 'pending'
    WHEN rejeitados > 0 THEN 'rejected'
    ELSE 'unverified' END::public.machine_verification;

  UPDATE public.machines
  SET verification_status = novo,
      verified_at = CASE WHEN novo = 'verified' THEN now() ELSE NULL END
  WHERE id = _machine_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_machine_verification(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.machine_documents_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_machine_verification(COALESCE(NEW.machine_id, OLD.machine_id));
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.machine_documents_sync() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS machine_documents_sync_trg ON public.machine_documents;
CREATE TRIGGER machine_documents_sync_trg
AFTER INSERT OR UPDATE OR DELETE ON public.machine_documents
FOR EACH ROW EXECUTE FUNCTION public.machine_documents_sync();

CREATE OR REPLACE FUNCTION public.review_machine_document(_doc_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem analisar documentos';
  END IF;
  UPDATE public.machine_documents
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END::public.machine_doc_status,
      review_notes = _notes,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _doc_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.review_machine_document(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_machine_document(uuid, boolean, text) TO authenticated;

DROP POLICY IF EXISTS machine_docs_owner_read ON storage.objects;
DROP POLICY IF EXISTS machine_docs_owner_write ON storage.objects;
DROP POLICY IF EXISTS machine_docs_owner_delete ON storage.objects;
CREATE POLICY machine_docs_owner_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'machine-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY machine_docs_owner_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'machine-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY machine_docs_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'machine-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
