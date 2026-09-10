CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info','warning','error','critical')),
  source text NOT NULL CHECK (char_length(source) <= 120),
  message text NOT NULL CHECK (char_length(message) <= 2000),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_events_created_idx ON public.system_events (created_at DESC);
CREATE INDEX IF NOT EXISTS system_events_severity_idx ON public.system_events (severity, created_at DESC);

GRANT SELECT ON public.system_events TO authenticated;
GRANT ALL ON public.system_events TO service_role;

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_events_admin_select" ON public.system_events;
CREATE POLICY "system_events_admin_select" ON public.system_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_system_event(
  _severity text,
  _source text,
  _message text,
  _context jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _recent int;
BEGIN
  IF _severity NOT IN ('info','warning','error','critical') THEN
    _severity := 'error';
  END IF;

  -- limite simples anti-flood por usuário/sessão (60 eventos por 5 minutos)
  SELECT count(*) INTO _recent
  FROM public.system_events
  WHERE created_at > now() - interval '5 minutes'
    AND user_id IS NOT DISTINCT FROM auth.uid();

  IF _recent > 60 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.system_events (severity, source, message, context, user_id)
  VALUES (
    _severity,
    left(coalesce(_source, 'app'), 120),
    left(coalesce(_message, ''), 2000),
    coalesce(_context, '{}'::jsonb),
    auth.uid()
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_system_event(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_system_event(text, text, text, jsonb) TO authenticated;